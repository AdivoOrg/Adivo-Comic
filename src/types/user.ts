export type ThemePreference = "system" | "light" | "dark";

export type ReadingMode = "vertical" | "single" | "double";

export type PageFitMode = "width" | "height" | "original";

export type ReadingDirection = "ltr" | "rtl";

export type LibraryStatus = "reading" | "plan_to_read" | "completed" | "on_hold" | "dropped";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  theme: ThemePreference;
  readingMode: ReadingMode;
  pageFit: PageFitMode;
  readingDirection: ReadingDirection;
  autoFocusMode: boolean;
  reducedMotion: boolean;
  updatedAt: number;
}

export interface LibraryEntry {
  comicId: string;
  title: string;
  posterUrl: string | null;
  comicType: string;
  status: LibraryStatus;
  addedAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  comicId: string;
  title: string;
  posterUrl: string | null;
  chapterRawId: string;
  chapterLabel: string;
  chapterNumber: number | null;
  language: string;
  pageNumber: number;
  totalPages: number;
  updatedAt: number;
}

export interface UserNotification {
  id: string;
  type: "chapter_release" | "comment_reply" | "system";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
}
