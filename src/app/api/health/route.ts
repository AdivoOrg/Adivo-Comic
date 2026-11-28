import { getServerEnv } from "@/lib/env";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { jsonOk } from "@/lib/http/response";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();
  return jsonOk(
    {
      status: "ok",
      omnifyConfigured: env.OMNIFY_API_KEY.length > 0,
      firebaseAdminConfigured: isFirebaseAdminConfigured(),
      rateLimitPerMinute: env.OMNIFY_RATE_LIMIT_PER_MINUTE
    },
    undefined,
    200,
    "no-store"
  );
}
