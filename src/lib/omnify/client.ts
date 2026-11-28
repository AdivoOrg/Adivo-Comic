import "server-only";
import { getAllowedOmnifyOrigin, getServerEnv } from "@/lib/env";
import { buildOmnifyCacheKey, withOmnifyCache } from "./cache";
import { consumeOmnifyRateLimit } from "./limiter";

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TRANSIENT_RETRIES = 2;

export class OmnifyApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(code: string, message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "OmnifyApiError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface OmnifyRawEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  pagination?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}

function parseRetryAfterHeader(headerValue: string | null): number {
  if (!headerValue) {
    return 10;
  }
  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(120, Math.ceil(seconds));
  }
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    const diffSec = Math.ceil((dateMs - Date.now()) / 1000);
    return Math.max(1, Math.min(120, diffSec));
  }
  return 10;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildValidatedUpstreamUrl(
  endpointPath: string,
  params: Record<string, string | number | undefined | null>
): URL {
  if (!endpointPath.startsWith("/comic/")) {
    throw new OmnifyApiError("INVALID_ENDPOINT", "Unsupported upstream endpoint", 400);
  }
  const env = getServerEnv();
  const url = new URL(endpointPath, env.OMNIFY_API_BASE_URL);
  if (url.origin !== getAllowedOmnifyOrigin()) {
    throw new OmnifyApiError("INVALID_UPSTREAM_HOST", "Disallowed upstream host", 500);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value).trim());
    }
  }
  return url;
}

async function fetchUpstreamOnce<T>(url: URL, apiKey: string): Promise<OmnifyRawEnvelope<T>> {
  const rateLimit = await consumeOmnifyRateLimit();
  if (!rateLimit.allowed) {
    throw new OmnifyApiError(
      "RATE_LIMITED",
      "Upstream request quota temporarily reached. Please retry shortly.",
      429,
      rateLimit.retryAfterSeconds
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (response.status === 429) {
      const retryAfter = parseRetryAfterHeader(response.headers.get("retry-after"));
      throw new OmnifyApiError(
        "UPSTREAM_RATE_LIMITED",
        "Service is busy right now. Please wait before retrying.",
        429,
        retryAfter
      );
    }

    if (response.status >= 500) {
      throw new OmnifyApiError("UPSTREAM_UNAVAILABLE", "Upstream catalog is temporarily unavailable.", 502);
    }

    const payload = (await response.json()) as OmnifyRawEnvelope<T>;
    if (!response.ok || payload.success === false) {
      const code = payload.error?.code || "UPSTREAM_ERROR";
      const status = response.status === 404 ? 404 : response.status === 400 ? 400 : 502;
      throw new OmnifyApiError(code, "Unable to retrieve requested catalog data.", status);
    }

    return payload;
  } catch (error) {
    if (error instanceof OmnifyApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new OmnifyApiError("UPSTREAM_TIMEOUT", "Catalog request timed out.", 504);
    }
    throw new OmnifyApiError("UPSTREAM_NETWORK_ERROR", "Unable to reach catalog service.", 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestOmnify<T>(
  endpointPath: string,
  params: Record<string, string | number | undefined | null>,
  ttlMs: number
): Promise<OmnifyRawEnvelope<T>> {
  const env = getServerEnv();
  if (!env.OMNIFY_API_KEY) {
    throw new OmnifyApiError(
      "SERVER_NOT_CONFIGURED",
      "Catalog API credentials are not configured on the server.",
      503
    );
  }

  const url = buildValidatedUpstreamUrl(endpointPath, params);
  const cacheKey = buildOmnifyCacheKey(endpointPath, params);

  return withOmnifyCache(cacheKey, ttlMs, async () => {
    let lastError: OmnifyApiError | null = null;
    for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
      try {
        return await fetchUpstreamOnce<T>(url, env.OMNIFY_API_KEY);
      } catch (error) {
        if (!(error instanceof OmnifyApiError)) {
          throw error;
        }
        lastError = error;
        const isTransient =
          error.code === "UPSTREAM_UNAVAILABLE" ||
          error.code === "UPSTREAM_TIMEOUT" ||
          error.code === "UPSTREAM_NETWORK_ERROR";

        if (!isTransient || attempt === MAX_TRANSIENT_RETRIES) {
          throw error;
        }

        const backoffMs = Math.min(2000, 350 * 2 ** attempt) + Math.floor(Math.random() * 150);
        await sleep(backoffMs);
      }
    }
    throw lastError ?? new OmnifyApiError("UPSTREAM_ERROR", "Request failed.", 502);
  });
}
