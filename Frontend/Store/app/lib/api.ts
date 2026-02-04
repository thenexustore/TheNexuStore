const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function apiRequestWithSession(
  endpoint: string,
  options: RequestInit = {},
  sessionId?: string,
) {
  const headers: any = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (sessionId) {
    headers["x-session-id"] = sessionId;
  }

  return apiRequest(endpoint, {
    ...options,
    headers,
  });
}
