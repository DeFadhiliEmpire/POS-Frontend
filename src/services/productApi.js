const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchProducts = async (token) => {
  try {
    const res = await fetch(`${API_URL}/products`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch products");
    }
    return data;
  } catch (err) {
    console.error("Failed to fetch products:", err);
    throw err;
  }
};

export const updateProducts = async (token, product) => {
  try {
    const res = await fetch(`${API_URL}/products/${product.productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...updatedFields,
        expectedVersion: product.version,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch products");
    }
    return data;
  } catch (err) {
    console.error("Failed to fetch products:", err);
    throw err;
  }
};
