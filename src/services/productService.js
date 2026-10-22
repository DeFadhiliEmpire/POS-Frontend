import { db } from "../db/db.js";

const saveProducts = async (products) => {
  try {
    if (!Array.isArray(products)) {
      throw new Error("Product must be an array");
    }

    await db.products.bulkPut(products);

    return { success: true, message: "Product saved successfully" };
  } catch (err) {
    console.error("Failed to save products:", err);

    throw err;
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
    if (!searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase();

    const products = await db.products
      .filter((product) => {
        return (
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term)
        );
      })
      .toArray();

    return products;
  } catch (err) {
    console.error("Failed to search products:", err);

    throw err;
  }
};

const clearProducts = async () => {
  try {
    await db.products.clear();

    return { success: true, message: "Products cleared successfully" };
  } catch (err) {
    console.error("Failed to clear products:", err);
    throw err;
  }
};

export {
  saveProducts,
  getProducts,
  getProductById,
  searchProducts,
  clearProducts,
};
