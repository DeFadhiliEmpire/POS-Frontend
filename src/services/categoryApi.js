const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchCategories = async (token) => {
  const res = await fetch(`${API_URL}/category`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch categories");
  }

  return data;
};
