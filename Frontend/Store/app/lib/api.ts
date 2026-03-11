import { API_URL } from "./env";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: unknown;
  error?: unknown;
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

function toErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => toErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.message,
      record.error,
      record.detail,
      record.title,
      record.reason,
    ];

    for (const candidate of candidates) {
      const parsed = toErrorMessage(candidate);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  const parsed = toErrorMessage(payload);
  return parsed ?? fallback;
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
    throw new Error(
      getApiErrorMessage(payload, `API error: ${response.statusText}`),
    );
  }

  if (isApiEnvelope(payload)) {
    if (!payload.success) {
      throw new Error(getApiErrorMessage(payload, "Unknown API error"));
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
