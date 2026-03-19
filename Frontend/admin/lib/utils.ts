import { API_URL } from "./constants";

export function adminLogout() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
  window.location.href = "/login";
}

export async function fetchWithAuth<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

  if (response.status === 401) {
    adminLogout();
    throw new Error("Session expired");
  }

  const contentType = response.headers.get("content-type") || "";
  const isJsonResponse = contentType.includes("application/json");
  const payload = isJsonResponse ? await response.json() : null;

  if (!response.ok) {
    const rawMessage = payload?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(" · ")
      : typeof rawMessage === "string"
        ? rawMessage
        : typeof rawMessage === "object" && rawMessage
          ? JSON.stringify(rawMessage)
          : `API request failed (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if (!payload.success) {
      throw new Error(payload.message || "API request failed");
    }

    return payload.data as T;
  }

  return payload as T;
}
