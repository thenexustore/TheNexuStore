import { API_URL } from "./env";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ApiEnvelope<unknown>).success === "boolean"
  );
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiEnvelope(payload)) {
      throw new Error(
        payload.message || payload.error || `API error: ${response.statusText}`,
      );
    }

    if (payload && typeof payload === "object" && "message" in payload) {
      throw new Error(
        String((payload as { message?: string }).message) ||
          `API error: ${response.statusText}`,
      );
    }

    throw new Error(`API error: ${response.statusText}`);
  }

  if (isApiEnvelope(payload)) {
    if (!payload.success) {
      throw new Error(payload.message || payload.error || "Unknown API error");
    }

    return payload.data;
  }

  return payload;
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
