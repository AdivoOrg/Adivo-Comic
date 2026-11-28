"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DEFAULT_USER_PREFERENCES,
  getUserPreferences,
  saveUserPreferences
} from "@/services/user-data";
import type {
  PageFitMode,
  ReadingDirection,
  ReadingMode,
  ThemePreference
} from "@/types/user";

const LOCAL_PREFS_KEY = "adivo-reader-preferences";

export function SettingsClient() {
  const { user } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [readingMode, setReadingMode] = useState<ReadingMode>(DEFAULT_USER_PREFERENCES.readingMode);
  const [pageFit, setPageFit] = useState<PageFitMode>(DEFAULT_USER_PREFERENCES.pageFit);
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    DEFAULT_USER_PREFERENCES.readingDirection
  );
  const [autoFocusMode, setAutoFocusMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<typeof DEFAULT_USER_PREFERENCES>;
        if (parsed.readingMode) setReadingMode(parsed.readingMode);
        if (parsed.pageFit) setPageFit(parsed.pageFit);
        if (parsed.readingDirection) setReadingDirection(parsed.readingDirection);
        if (typeof parsed.autoFocusMode === "boolean") setAutoFocusMode(parsed.autoFocusMode);
        if (typeof parsed.reducedMotion === "boolean") setReducedMotion(parsed.reducedMotion);
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserPreferences(user.uid)
      .then((prefs) => {
        if (!prefs) return;
        setThemePreference(prefs.theme);
        setReadingMode(prefs.readingMode);
        setPageFit(prefs.pageFit);
        setReadingDirection(prefs.readingDirection);
        setAutoFocusMode(prefs.autoFocusMode);
        setReducedMotion(prefs.reducedMotion);
      })
      .catch(() => {});
  }, [user, setThemePreference]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const payload = {
      theme: themePreference,
      readingMode,
      pageFit,
      readingDirection,
      autoFocusMode,
      reducedMotion,
      updatedAt: Date.now()
    };

    try {
      window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(payload));
      if (user) {
        await saveUserPreferences(user.uid, payload);
        setFeedback("Preferences synced to your account.");
      } else {
        setFeedback("Preferences saved on this device.");
      }
    } catch {
      setFeedback("Saved locally. Cloud sync is temporarily unavailable.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Theme</h2>
          <p className="text-xs text-ink-secondary">
            Choose Dark Mode, Light Mode, or follow your device setting.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["dark", "light", "system"] as ThemePreference[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setThemePreference(option)}
              className={`h-11 rounded-xl border text-sm font-medium capitalize transition-colors ${
                themePreference === option
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-canvas text-ink-secondary hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-5 p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Reader Defaults</h2>
          <p className="text-xs text-ink-secondary">
            Applied automatically whenever you open a chapter in the reader.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Reading Mode
            <select
              value={readingMode}
              onChange={(event) => setReadingMode(event.target.value as ReadingMode)}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              <option value="vertical">Vertical Strip</option>
              <option value="single">Single Page</option>
              <option value="double">Double Page</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Page Fit
            <select
              value={pageFit}
              onChange={(event) => setPageFit(event.target.value as PageFitMode)}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              <option value="width">Fit Width</option>
              <option value="height">Fit Height</option>
              <option value="original">Original Size</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-secondary">
            Page Direction
            <select
              value={readingDirection}
              onChange={(event) => setReadingDirection(event.target.value as ReadingDirection)}
              className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink focus:border-accent"
            >
              <option value="ltr">Left to Right</option>
              <option value="rtl">Right to Left</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-ink">Auto focus mode</span>
              <span className="block text-xs text-ink-secondary">
                Hide reader toolbars automatically when opening a chapter.
              </span>
            </span>
            <input
              type="checkbox"
              checked={autoFocusMode}
              onChange={(event) => setAutoFocusMode(event.target.checked)}
              className="h-5 w-5 accent-accent"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-ink">Reduced motion preference</span>
              <span className="block text-xs text-ink-secondary">
                Minimize non-essential transitions across reader controls.
              </span>
            </span>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
              className="h-5 w-5 accent-accent"
            />
          </label>
        </div>

        {feedback ? (
          <p role="status" className="text-xs text-status-success">
            {feedback}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={saving} onClick={() => void handleSave()}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
