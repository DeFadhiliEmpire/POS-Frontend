const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(endpoint, token, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    const error = new Error(data.message || "Category request failed");

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data;
}

export const fetchCategories = async (token, includeInactive = false) => {
  const query = includeInactive ? "?includeInactive=true" : "";

  return request(`/categories${query}`, token);
};

export const createCategoryRemote = async (token, payload) => {
  return request("/categories", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateCategoryRemote = async (token, categoryUid, payload) => {
  return request(`/categories/${categoryUid}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const updateCategoryStatusRemote = async (
  token,
  categoryUid,
  payload,
) => {
  return request(`/categories/${categoryUid}/status`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
