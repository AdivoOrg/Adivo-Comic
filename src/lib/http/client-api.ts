import type { ApiEnvelope, PaginationMeta } from "@/types/api";

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(code: string, message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ClientApiError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ClientApiResult<T> {
  data: T;
  pagination: PaginationMeta | null;
}

export async function apiRequest<T>(
  url: string,
  init?: RequestInit
): Promise<ClientApiResult<T>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    }
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ClientApiError(
      "INVALID_RESPONSE",
      "Unexpected response from server.",
      response.status || 500
    );
  }

  if (!response.ok || !payload || !payload.ok) {
    const err = payload && !payload.ok ? payload.error : null;
    throw new ClientApiError(
      err?.code || "REQUEST_FAILED",
      err?.message || "Request failed. Please try again.",
      response.status || 500,
      err?.retryAfterSeconds
    );
  }

  return {
    data: payload.data,
    pagination: payload.pagination ?? null
  };
}
