import { API_URL } from "./constants";

export function adminLogout() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
  window.location.href = "/login";
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "API request failed");
  }

  return data.data;
}
