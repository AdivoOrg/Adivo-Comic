import { get, ref, remove, set, update } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase/client";
import type {
  HistoryEntry,
  LibraryEntry,
  UserNotification,
  UserPreferences,
  UserProfile
} from "@/types/user";

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, "updatedAt"> = {
  theme: "dark",
  readingMode: "vertical",
  pageFit: "width",
  readingDirection: "ltr",
  autoFocusMode: false,
  reducedMotion: false
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/profile`));
  if (!snap.exists()) {
    return null;
  }
  const value = snap.val() as Omit<UserProfile, "uid">;
  return { uid, ...value };
}

export async function saveUserProfile(
  uid: string,
  profile: Omit<UserProfile, "uid">
): Promise<void> {
  const db = getFirebaseDatabase();
  await set(ref(db, `users/${uid}/profile`), profile);
}

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/preferences`));
  return snap.exists() ? (snap.val() as UserPreferences) : null;
}

export async function saveUserPreferences(
  uid: string,
  preferences: UserPreferences
): Promise<void> {
  const db = getFirebaseDatabase();
  await set(ref(db, `users/${uid}/preferences`), preferences);
}

export async function listLibraryEntries(uid: string): Promise<LibraryEntry[]> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/library`));
  if (!snap.exists()) {
    return [];
  }
  const record = snap.val() as Record<string, LibraryEntry>;
  return Object.values(record).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertLibraryEntry(uid: string, entry: LibraryEntry): Promise<void> {
  const db = getFirebaseDatabase();
  await set(ref(db, `users/${uid}/library/${entry.comicId}`), entry);
}

export async function removeLibraryEntry(uid: string, comicId: string): Promise<void> {
  const db = getFirebaseDatabase();
  await remove(ref(db, `users/${uid}/library/${comicId}`));
}

export async function listHistoryEntries(uid: string): Promise<HistoryEntry[]> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/history`));
  if (!snap.exists()) {
    return [];
  }
  const record = snap.val() as Record<string, HistoryEntry>;
  return Object.values(record).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertHistoryEntry(uid: string, entry: HistoryEntry): Promise<void> {
  const db = getFirebaseDatabase();
  await set(ref(db, `users/${uid}/history/${entry.comicId}`), entry);
}

export async function removeHistoryEntry(uid: string, comicId: string): Promise<void> {
  const db = getFirebaseDatabase();
  await remove(ref(db, `users/${uid}/history/${comicId}`));
}

export async function listNotifications(uid: string): Promise<UserNotification[]> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/notifications`));
  if (!snap.exists()) {
    return [];
  }
  const record = snap.val() as Record<string, Omit<UserNotification, "id">>;
  return Object.entries(record)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const db = getFirebaseDatabase();
  await update(ref(db, `users/${uid}/notifications/${notificationId}`), { read: true });
}
