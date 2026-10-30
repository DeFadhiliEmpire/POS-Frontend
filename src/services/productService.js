import { db } from "../db/db.js";

import { createObjectId, queueCatalogueOperation } from "./catalogueQueue.js";

const validateProduct = (product) => {
  if (!product.name?.trim()) {
    throw new Error("Product name is required");
  }

  if (!product.sku?.trim()) {
    throw new Error("Product SKU is required");
  }

  if (!product.categoryId) {
    throw new Error("Product category is required");
  }

  if (
    !Number.isFinite(product.buyingPrice) ||
    product.buyingPrice < 0 ||
    !Number.isFinite(product.sellingPrice) ||
    product.sellingPrice < 0
  ) {
    throw new Error("Valid non-negative prices are required");
  }

  if (
    product.lowStockThreshold !== undefined &&
    (!Number.isFinite(product.lowStockThreshold) ||
      product.lowStockThreshold < 0)
  ) {
    throw new Error("Invalid low-stock threshold");
  }
};

const createProduct = async (input) => {
  validateProduct(input);

  return db.transaction(
    "rw",
    db.products,
    db.categories,
    db.catalogueSync,
    async () => {
      const category = await db.categories.get(input.categoryId);

      if (!category || !category.isActive) {
        throw new Error("Select an active category");
      }

      const sku = input.sku.trim().toUpperCase();

      const duplicate = await db.products.where("sku").equals(sku).first();

      if (duplicate && duplicate.isActive) {
        throw new Error("A product with this SKU already exists");
      }

      const productId = createObjectId();

      const product = {
        productId,
        name: input.name.trim(),
        sku,
        barcode: input.barcode?.trim() || "",
        categoryId: input.categoryId,
        buyingPrice: input.buyingPrice,
        sellingPrice: input.sellingPrice,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        unit: input.unit || "piece",
        imageUrl: input.imageUrl || "",
        stockQuantity: 0,
        isActive: true,
        version: 0,
        syncStatus: "pending",
      };

      await db.products.add(product);

      await queueCatalogueOperation({
        entityType: "product",
        entityId: productId,
        action: "create",
        baseVersion: 0,
        payload: {
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.categoryId,
          buyingPrice: product.buyingPrice,
          sellingPrice: product.sellingPrice,
          lowStockThreshold: product.lowStockThreshold,
          unit: product.unit,
          imageUrl: product.imageUrl,
        },
      });

      return product;
    },
  );
};

const updateProduct = async (productId, changes) => {
  const allowedFields = [
    "name",
    "sku",
    "barcode",
    "categoryId",
    "buyingPrice",
    "sellingPrice",
    "lowStockThreshold",
    "unit",
    "imageUrl",
  ];

  const cleanChanges = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      cleanChanges[field] = changes[field];
    }
  }

  return db.transaction(
    "rw",
    db.products,
    db.categories,
    db.catalogueSync,
    async () => {
      const product = await db.products.get(productId);

      if (!product || !product.isActive) {
        throw new Error("Product not found or inactive");
      }

      if (product.syncStatus === "conflict") {
        throw new Error("Resolve this product's sync conflict first");
      }

      const updated = {
        ...product,
        ...cleanChanges,
      };

      validateProduct(updated);

      updated.name = updated.name.trim();
      updated.sku = updated.sku.trim().toUpperCase();

      if (cleanChanges.categoryId || cleanChanges.category) {
        const categoryId = cleanChanges.categoryId || cleanChanges.category;

        const category = await db.categories.get(categoryId);

        if (!category || !category.isActive) {
          throw new Error("Select an active category");
        }

        updated.categoryId = categoryId;
      }

      const duplicate = await db.products
        .where("sku")
        .equals(updated.sku)
        .first();

      if (
        duplicate &&
        duplicate.productId !== productId &&
        duplicate.isActive
      ) {
        throw new Error("Another product already uses this SKU");
      }

      delete updated.category;

      await db.products.put({
        ...updated,
        syncStatus: "pending",
      });

      await queueCatalogueOperation({
        entityType: "product",
        entityId: productId,
        action: "update",
        baseVersion: product.version || 1,
        payload: {
          name: updated.name,
          sku: updated.sku,
          barcode: updated.barcode,
          category: updated.categoryId,
          buyingPrice: updated.buyingPrice,
          sellingPrice: updated.sellingPrice,
          lowStockThreshold: updated.lowStockThreshold,
          unit: updated.unit,
          imageUrl: updated.imageUrl,
        },
      });

      return updated;
    },
  );
};

const deactivateProduct = async (productId) => {
  return db.transaction("rw", db.products, db.catalogueSync, async () => {
    const product = await db.products.get(productId);

    if (!product || !product.isActive) {
      throw new Error("Product not found or already inactive");
    }

    if (product.syncStatus === "conflict") {
      throw new Error("Resolve this product's sync conflict first");
    }

    await db.products.update(productId, {
      isActive: false,
      syncStatus: "pending",
    });

    await queueCatalogueOperation({
      entityType: "product",
      entityId: productId,
      action: "deactivate",
      baseVersion: product.version || 1,
      payload: {},
    });

    return { success: true };
  });
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
      .filter((product) => {
        if (!product.isActive) return false;

        return (
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term)
        );
      })
      .toArray();
  } catch (err) {
    console.error("Failed to search products:", err);

    throw err;
  }
};

export {
  createProduct,
  updateProduct,
  deactivateProduct,
  getProducts,
  getProductById,
  searchProducts,
};
