import { fetchProducts } from "./productApi";
import { fetchCategories } from "./categoryApi.js";
import { saveProducts } from "./productService";
import { db } from "../db/db.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const syncProducts = async (token) => {
  try {
    const data = await fetchProducts(token);

    if (!data.success) {
      throw new Error(data.message || "Failed to synchronize products");
    }

    const products = data.products.map((product) => ({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.category?._id || product.category,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      unit: product.unit,
      image: product.image,
      isActive: product.isActive,
    }));

    await saveProducts(products);

    return {
      success: true,
      message: "Products synchronized successfully",
      count: data.products.length,
    };
  } catch (err) {
    console.error("Product synchronization failed:", err);

    throw err;
  }
};

const syncCategories = async (token) => {
  try {
    if (!navigator.onLine) {
      return {
        success: false,
        message: "No internet connection",
      };
    }

    if (!token) {
      throw new Error("Authentication token is required");
    }

    const data = await fetchCategories(token);
    // Preserve the local naming convention.
    const categories = data.categories.map((category) => ({
      categoryId: category._id,
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
    }));

    await db.transaction("rw", db.categories, async () => {
      await db.categories.bulkPut(categories);
    });

    return {
      success: true,
      message: "Categories synchronized successfully",
      count: categories.length,
    };
  } catch (error) {
    console.error("Category synchronization failed:", error);
    throw error;
  }
};

//send pending offline sales to MongoDB
const syncOfflineSales = async (token) => {
  try {
    //stop if there is no intrnet
    if (!navigator.onLine) {
      return { success: false, message: "No internet connection" };
    }

    if (!token) {
      throw new Error("Authentication token is required for sync");
    }

    const pendingItems = await db.pendingSync
      .where("type")
      .equals("sale")
      .filter((item) => item.status === "pending")
      .toArray();

    if (pendingItems.length === 0) {
      return { success: true, message: "No pending sales to sync" };
    }

    const salesToSync = [];

    for (const item of pendingItems) {
      if (!item.referenceId || typeof item.referenceId !== "string") {
        console.warn("Invalid referenceId:", item.referenceId);
        continue;
      }

      const sale = await db.sales
        .where("clientSaleId")
        .equals(item.referenceId)
        .first();

      if (sale && sale.syncStatus === "pending") {
        salesToSync.push(sale);
      }
    }

    if (salesToSync.length === 0) {
      return { success: true, message: "No pending sales found" };
    }

    //All sales in this batch should belong to this device
    const deviceIds = [...new Set(salesToSync.map((sale) => sale.deviceId))];

    if (deviceIds.length !== 1) {
      throw new Error(
        "pending sales belong to different devices; synchronize them separately",
      );
    }

    const deviceId = deviceIds[0];

    //remove local-only fields before sending to the backend
    const sales = salesToSync.map((sale) => ({
      clientSaleId: sale.clientSaleId,
      receiptNumber: sale.receiptNumber,
      items: sale.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      payment: sale.payment,
      discount: sale.discount || 0,
      tax: sale.tax || 0,
      occurredAt: sale.occurredAt,
    }));

    const res = await fetch(`${API_URL}/sync/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-device-id": deviceId,
      },
      body: JSON.stringify({ sales }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("Backend error response:", raw);
      throw new Error(raw || "Failed to synchronize offline sales");
    }

    const data = await res.json();

    //Process each individual result
    for (const result of data.results || []) {
      const sale = salesToSync.find(
        (item) => item.clientSaleId === result.clientSaleId,
      );

      if (!sale) continue;

      if (result.status === "synced" || result.status === "already_synced") {
        await db.transaction("rw", db.sales, db.pendingSync, async () => {
          await db.sales
            .where("clientSaleId")
            .equals(sale.clientSaleId)
            .modify({
              syncStatus: "synced",
              serverSaleId: result.saleId,
              syncedAt: new Date().toISOString(),
            });

          await db.pendingSync
            .where({ type: "sale", referenceId: sale.clientSaleId })
            .delete();
        });
      } else if (result.status === "conflict") {
        // Preserve the sale for later resolution.
        // Do not automatically retry a stock conflict forever.
        await db.pendingSync
          .where({
            type: "sale",
            referenceId: sale.clientSaleId,
          })
          .modify({
            status: "conflict",
            lastError: result.message,
          });

        await db.sales.where("clientSaleId").equals(sale.clientSaleId).modify({
          syncStatus: "conflict",
          syncError: result.message,
        });
      } else {
        // Keep failed sales queued for a later retry.
        await db.pendingSync
          .where({
            type: "sale",
            referenceId: sale.clientSaleId,
          })
          .modify({
            status: "pending",
            lastError: result.message || "Synchronization failed",
          });
      }
    }

    return {
      success: true,
      message: data.message,
      summary: data.summary,
      results: data.results,
    };
  } catch (error) {
    console.error("Offline sales synchronization error:", error);

    return {
      success: false,
      message: error.message || "Synchronization failed",
    };
  }
};

let isAutoSyncRunning = false;

const startAutomaticSaleSync = (getToken, onResult) => {
  let stopped = false;

  const runSync = async () => {
    if (stopped || isAutoSyncRunning || !navigator.onLine) {
      return { success: false, message: "Sync skipped: offline or stopped" };
    }

    isAutoSyncRunning = true;

    try {
      const token = await getToken();

      if (stopped || !token || !navigator.onLine) {
        return {
          success: false,
          message: "Sync aborted: missing token or offline",
        };
      }

      const result = await syncOfflineSales(token);

      if (!stopped && typeof onResult === "function") {
        onResult(result);
      }
    } catch (error) {
      console.error("Automatic sale sync error:", error);
    } finally {
      isAutoSyncRunning = false;
    }
  };

  const handleOnline = () => {
    console.log("Internet connection restored. Syncing pending sales...");
    runSync();
  };

  window.addEventListener("online", handleOnline);

  //also sync pending sales when the app starts online.
  runSync();

  return () => {
    stopped = true;
    window.removeEventListener("online", handleOnline);
  };
};

export {
  syncProducts,
  syncCategories,
  syncOfflineSales,
  startAutomaticSaleSync,
};
