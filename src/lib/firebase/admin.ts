import "server-only";
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getServerEnv } from "@/lib/env";

export interface VerifiedSessionUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];
  if (!trimmed.startsWith("{")) {
    try {
      candidates.push(Buffer.from(trimmed, "base64").toString("utf8"));
    } catch {
      return null;
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const projectId = typeof parsed.project_id === "string" ? parsed.project_id : typeof parsed.projectId === "string" ? parsed.projectId : "";
      const clientEmail = typeof parsed.client_email === "string" ? parsed.client_email : typeof parsed.clientEmail === "string" ? parsed.clientEmail : "";
      const rawPrivateKey = typeof parsed.private_key === "string" ? parsed.private_key : typeof parsed.privateKey === "string" ? parsed.privateKey : "";

      if (projectId && clientEmail && rawPrivateKey) {
        return {
          projectId,
          clientEmail,
          privateKey: rawPrivateKey.replace(/\\n/g, "\n")
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  const env = getServerEnv();
  return parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON) !== null;
}

export function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }
  const env = getServerEnv();
  const serviceAccount = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!serviceAccount) {
    return null;
  }
  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: env.FIREBASE_DATABASE_URL
  });
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDatabase(): Database | null {
  const app = getFirebaseAdminApp();
  return app ? getDatabase(app) : null;
}

export async function verifyBearerToken(request: Request): Promise<VerifiedSessionUser | null> {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const idToken = header.slice(7).trim();
  if (!idToken || idToken.length > 4096) {
    return null;
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const fallbackName = `Reader ${decoded.uid.slice(0, 6)}`;
    const rawName = typeof decoded.name === "string" ? decoded.name.trim() : "";
    const displayName = rawName.length >= 2 ? rawName.slice(0, 40) : fallbackName;
    const photoURL =
      typeof decoded.picture === "string" && decoded.picture.startsWith("https://")
        ? decoded.picture.slice(0, 500)
        : null;

    return {
      uid: decoded.uid,
      displayName,
      photoURL
    };
  } catch {
    return null;
  }
}
