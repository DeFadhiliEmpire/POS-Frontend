import { useEffect } from "react";

import {
  saveProducts,
  getProducts,
  searchProducts,
} from "./services/productService.js";

const TestProducts = () => {
  useEffect(() => {
    const testDatabase = async () => {
      try {
        const products = [
          {
            productId: "product-001",
            name: "Milk",
            sku: "MILK-001",
            barcode: "616110123456",
            sellingPrice: 70,
            buyingPrice: 55,
            stockQuantity: 50,
            categoryId: "category-001",
            isActive: true,
          },
          {
            productId: "product-002",
            name: "Bread",
            sku: "BREAD-001",
            barcode: "616110654321",
            sellingPrice: 65,
            buyingPrice: 50,
            stockQuantity: 30,
            categoryId: "category-002",
            isActive: true,
          },
        ];

        await saveProducts(products);

        const allproducts = await getProducts();

        console.log("All products:", allproducts);

        const searchResult = await searchProducts("bread");
        console.log("Search result:", searchResult);
      } catch (err) {
        console.error("Database test failed:", err);
      }
    };

    testDatabase();
  }, []);

  return <h1>Testing IndexedDB...</h1>;
};

export default TestProducts;
