import { db } from "../db/db.js";

const saveProducts = async (products) => {
  if (!Array.isArray(products)) {
    throw new Error("Product must be an array");
  }

  try {
    let saved = 0;
    let preserved = 0;

    await db.transaction("rw", db.products, async () => {
      for (const product of products) {
        if (!product.productId) {
          continue;
        }

        const existing = await db.products.get(product.productId);

        // Never overwrite an unresolved local edit.
        if (existing && ["pending", "conflict"].includes(existing.syncStatus)) {
          preserved++;
          continue;
        }

        await db.products.put({
          ...existing,
          ...product,
          syncStatus: "synced",
          lastSyncedAt: new Date().toISOString(),
        });

        saved++;
      }
    });

    return {
      success: true,
      message: "Products saved successfully",
      saved,
      preserved,
    };
  } catch (error) {
    console.error("Failed to save products:", error);
    throw error;
  }
};

const getProducts = async () => {
  try {
    const products = await db.products.toArray();
    return products;
  } catch (err) {
    console.error("Failed to get products:", err);
    throw err;
  }
};

const getProductById = async (productId) => {
  try {
    const product = await db.products
      .where("productId")
      .equals(productId)
      .first();

    return product;
  } catch (err) {
    console.error("Failed to get product:", err);

    throw err;
  }
};

const searchProducts = async (searchTerm) => {
  try {
    if (!searchTerm?.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase();

    return db.products
      .filter(
        (product) =>
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term),
      )
      .toArray();
  } catch (err) {
    console.error("Failed to search products:", err);

    throw err;
  }
};

const clearProducts = async () => {
  try {
    throw new Error(
      "Clearing the product cache is disabled to protect local data.",
    );
  } catch (err) {
    console.error("Failed to clear products:", err);
    throw err;
  }
};

async function updateProductLocally(productId, changes) {
  await db.transaction("rw", db.products, db.catalogueSync, async () => {
    const product = await db.products.get(productId);

    if (!product) {
      throw new Error("Product not found locally");
    }

    await db.product.put({
      ...product,
      ...changes,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    });

    await db.catalogueSync.add({
      entityType: "Product",
      entityId: productId,
      operation: "update",
      changes,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  });
}

export {
  saveProducts,
  getProducts,
  getProductById,
  searchProducts,
  clearProducts,
  updateProductLocally,
};
