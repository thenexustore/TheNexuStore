import { API_URL } from "./env";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

let csrfTokenCache: string | null = null;
let csrfRequestInFlight: Promise<string> | null = null;

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ApiEnvelope<unknown>).success === "boolean"
  );
}

const isMutationMethod = (method: string) =>
  ["POST", "PUT", "PATCH", "DELETE"].includes(method);

async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  if (!csrfRequestInFlight) {
    csrfRequestInFlight = (async () => {
      const response = await fetch(`${API_URL}/auth/csrf-token`, {
        method: "GET",
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const token =
        (isApiEnvelope(payload) ? (payload.data as { csrfToken?: string })?.csrfToken : null) ||
        ((payload as { csrfToken?: string } | null)?.csrfToken ?? null);

      if (!token) {
        throw new Error("CSRF token missing from backend response");
      }

      csrfTokenCache = token;
      return token;
    })().finally(() => {
      csrfRequestInFlight = null;
    });
  }

  return csrfRequestInFlight;
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (isMutationMethod(method)) {
    headers["x-csrf-token"] = await fetchCsrfToken();
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
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
