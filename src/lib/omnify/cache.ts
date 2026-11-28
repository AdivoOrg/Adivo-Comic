import "server-only";
import { createHash } from "node:crypto";
import { getAdminDatabase } from "@/lib/firebase/admin";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_MEMORY_ENTRIES = 400;
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export function buildOmnifyCacheKey(
  endpoint: string,
  params: Record<string, string | number | undefined | null>
): string {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).trim()}`);

  return `${endpoint}?${sortedEntries.join("&")}`;
}

function hashCacheKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

function getFromMemory<T>(key: string, nowMs: number): T | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= nowMs) {
    memoryCache.delete(key);
    return null;
  }
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value as T;
}

function setInMemory<T>(key: string, value: T, ttlMs: number, nowMs: number): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(key, { value, expiresAt: nowMs + ttlMs });
}

async function getFromSharedCache<T>(key: string, nowMs: number): Promise<T | null> {
  const db = getAdminDatabase();
  if (!db) {
    return null;
  }
  try {
    const snap = await db.ref(`_internal/cache/omnify/${hashCacheKey(key)}`).get();
    if (!snap.exists()) {
      return null;
    }
    const payload = snap.val() as CacheEntry<T> | null;
    if (!payload || typeof payload.expiresAt !== "number" || payload.expiresAt <= nowMs) {
      return null;
    }
    return payload.value;
  } catch {
    return null;
  }
}

async function setInSharedCache<T>(key: string, value: T, ttlMs: number, nowMs: number): Promise<void> {
  const db = getAdminDatabase();
  if (!db) {
    return;
  }
  try {
    await db.ref(`_internal/cache/omnify/${hashCacheKey(key)}`).set({
      value,
      expiresAt: nowMs + ttlMs
    });
  } catch {
    return;
  }
}

export async function withOmnifyCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const nowMs = Date.now();
  const memHit = getFromMemory<T>(key, nowMs);
  if (memHit !== null) {
    return memHit;
  }

  const existingInflight = inflightRequests.get(key);
  if (existingInflight) {
    return existingInflight as Promise<T>;
  }

  const task = (async () => {
    const sharedHit = await getFromSharedCache<T>(key, Date.now());
    if (sharedHit !== null) {
      setInMemory(key, sharedHit, ttlMs, Date.now());
      return sharedHit;
    }

    const fresh = await loader();
    const writeTime = Date.now();
    setInMemory(key, fresh, ttlMs, writeTime);
    void setInSharedCache(key, fresh, ttlMs, writeTime);
    return fresh;
  })();

  inflightRequests.set(key, task);
  try {
    return await task;
  } finally {
    inflightRequests.delete(key);
  }
}

export function clearMemoryCache(): void {
  memoryCache.clear();
  inflightRequests.clear();
}
