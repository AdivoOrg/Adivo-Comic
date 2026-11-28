import "server-only";
import { z } from "zod";

const ALLOWED_OMNIFY_ORIGIN = "https://premium.omnifylabs.sbs";
const HARD_MAX_RATE_LIMIT_PER_MINUTE = 300;

const serverEnvSchema = z.object({
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  OMNIFY_API_BASE_URL: z
    .string()
    .url()
    .default(ALLOWED_OMNIFY_ORIGIN)
    .refine((value) => {
      try {
        return new URL(value).origin === ALLOWED_OMNIFY_ORIGIN;
      } catch {
        return false;
      }
    }, "OMNIFY_API_BASE_URL must target https://premium.omnifylabs.sbs"),
  OMNIFY_API_KEY: z.string().trim().optional().default(""),
  OMNIFY_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(HARD_MAX_RATE_LIMIT_PER_MINUTE)
    .default(HARD_MAX_RATE_LIMIT_PER_MINUTE),
  FIREBASE_DATABASE_URL: z
    .string()
    .url()
    .default("https://adivo-comic-default-rtdb.asia-southeast1.firebasedatabase.app"),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().trim().optional().default("")
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
    OMNIFY_API_BASE_URL: process.env.OMNIFY_API_BASE_URL || ALLOWED_OMNIFY_ORIGIN,
    OMNIFY_API_KEY: process.env.OMNIFY_API_KEY || "",
    OMNIFY_RATE_LIMIT_PER_MINUTE: process.env.OMNIFY_RATE_LIMIT_PER_MINUTE || HARD_MAX_RATE_LIMIT_PER_MINUTE,
    FIREBASE_DATABASE_URL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://adivo-comic-default-rtdb.asia-southeast1.firebasedatabase.app",
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ""
  });

  if (!parsed.success) {
    throw new Error("Invalid server environment configuration");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetServerEnvCache(): void {
  cachedEnv = null;
}

export function getAllowedOmnifyOrigin(): string {
  return ALLOWED_OMNIFY_ORIGIN;
}

export function getHardMaxRateLimitPerMinute(): number {
  return HARD_MAX_RATE_LIMIT_PER_MINUTE;
}
