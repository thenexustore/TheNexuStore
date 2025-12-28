const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${API_URL}/staff/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export async function fetchAdminData(
  endpoint: string,
  params?: Record<string, string>
) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const queryString = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  const response = await fetch(`${API_URL}/admin/${endpoint}${queryString}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "API request failed");
  }

  return result.data;
}

export async function postAdminData(endpoint: string, data: any) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}/admin/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function putAdminData(endpoint: string, data: any) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}/admin/${endpoint}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function deleteAdminData(endpoint: string) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}/admin/${endpoint}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getCategories() {
  return fetchAdminData("categories");
}

export async function createCategory(data: {
  name: string;
  parent_id?: string;
  sort_order?: number;
}) {
  return postAdminData("categories", data);
}

export function adminLogout() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
  window.location.href = "/login";
}
