import "server-only";
import { getAdminDatabase } from "@/lib/firebase/admin";
import { getHardMaxRateLimitPerMinute, getServerEnv } from "@/lib/env";

const WINDOW_SECONDS = 60;

export interface RateLimitBuckets {
  buckets: Record<string, number>;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  distributed: boolean;
}

export interface RateLimitStore {
  distributed: boolean;
  consume(nowMs: number, limit: number): Promise<RateLimitResult>;
}

export function evaluateRollingWindow(
  current: RateLimitBuckets | null | undefined,
  nowMs: number,
  limit: number
): { nextState: RateLimitBuckets; allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const safeLimit = Math.max(1, Math.min(limit, getHardMaxRateLimitPerMinute()));
  const nowSec = Math.floor(nowMs / 1000);
  const cutoffSec = nowSec - WINDOW_SECONDS;
  const sourceBuckets = current?.buckets && typeof current.buckets === "object" ? current.buckets : {};
  const pruned: Record<string, number> = {};
  let total = 0;
  let oldestSec = nowSec;

  for (const [key, value] of Object.entries(sourceBuckets)) {
    const sec = Number(key);
    if (!Number.isInteger(sec) || sec <= cutoffSec || sec > nowSec + WINDOW_SECONDS) {
      continue;
    }
    const count = typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    if (count > 0) {
      pruned[String(sec)] = count;
      total += count;
      if (sec < oldestSec) {
        oldestSec = sec;
      }
    }
  }

  if (total >= safeLimit) {
    const retryAfterSeconds = Math.max(1, oldestSec + WINDOW_SECONDS - nowSec);
    return {
      nextState: { buckets: pruned },
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  const currentKey = String(nowSec);
  pruned[currentKey] = (pruned[currentKey] || 0) + 1;
  const newTotal = total + 1;

  return {
    nextState: { buckets: pruned },
    allowed: true,
    remaining: Math.max(0, safeLimit - newTotal),
    retryAfterSeconds: 0
  };
}

export function createMemoryRateLimitStore(): RateLimitStore {
  let state: RateLimitBuckets = { buckets: {} };
  return {
    distributed: false,
    async consume(nowMs: number, limit: number): Promise<RateLimitResult> {
      const outcome = evaluateRollingWindow(state, nowMs, limit);
      state = outcome.nextState;
      return {
        allowed: outcome.allowed,
        limit: Math.max(1, Math.min(limit, getHardMaxRateLimitPerMinute())),
        remaining: outcome.remaining,
        retryAfterSeconds: outcome.retryAfterSeconds,
        distributed: false
      };
    }
  };
}

function createFirebaseRateLimitStore(path: string): RateLimitStore | null {
  const db = getAdminDatabase();
  if (!db) {
    return null;
  }

  return {
    distributed: true,
    async consume(nowMs: number, limit: number): Promise<RateLimitResult> {
      const safeLimit = Math.max(1, Math.min(limit, getHardMaxRateLimitPerMinute()));
      let lastOutcome = {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 1
      };

      const ref = db.ref(path);
      const txResult = await ref.transaction((currentData: RateLimitBuckets | null) => {
        const evaluated = evaluateRollingWindow(currentData, nowMs, safeLimit);
        lastOutcome = {
          allowed: evaluated.allowed,
          remaining: evaluated.remaining,
          retryAfterSeconds: evaluated.retryAfterSeconds
        };
        if (!evaluated.allowed) {
          return;
        }
        return evaluated.nextState;
      });

      if (!txResult.committed && lastOutcome.allowed) {
        return {
          allowed: false,
          limit: safeLimit,
          remaining: 0,
          retryAfterSeconds: 1,
          distributed: true
        };
      }

      return {
        allowed: lastOutcome.allowed,
        limit: safeLimit,
        remaining: lastOutcome.remaining,
        retryAfterSeconds: lastOutcome.retryAfterSeconds,
        distributed: true
      };
    }
  };
}

const fallbackOmnifyStore = createMemoryRateLimitStore();
const fallbackCommentStore = createMemoryRateLimitStore();

export async function consumeOmnifyRateLimit(
  storeOverride?: RateLimitStore,
  nowMs: number = Date.now()
): Promise<RateLimitResult> {
  const env = getServerEnv();
  const limit = Math.min(env.OMNIFY_RATE_LIMIT_PER_MINUTE, getHardMaxRateLimitPerMinute());
  const store = storeOverride || createFirebaseRateLimitStore("_internal/rateLimits/omnify") || fallbackOmnifyStore;
  return store.consume(nowMs, limit);
}

export async function consumeCommentRateLimit(
  uid: string,
  nowMs: number = Date.now()
): Promise<RateLimitResult> {
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const store =
    createFirebaseRateLimitStore(`_internal/rateLimits/comments/${safeUid}`) || fallbackCommentStore;
  return store.consume(nowMs, 10);
}
