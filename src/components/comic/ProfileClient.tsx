"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { Bookmark, History, LogOut, Save, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import {
  getUserProfile,
  listHistoryEntries,
  listLibraryEntries,
  saveUserProfile
} from "@/services/user-data";

export function ProfileClient() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [libraryCount, setLibraryCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || `Reader ${user.uid.slice(0, 6)}`);
    Promise.all([
      getUserProfile(user.uid),
      listLibraryEntries(user.uid),
      listHistoryEntries(user.uid)
    ])
      .then(([profile, lib, hist]) => {
        if (profile) {
          setDisplayName(profile.displayName);
          setBio(profile.bio);
          setCreatedAt(profile.createdAt);
        }
        setLibraryCount(lib.length);
        setHistoryCount(hist.length);
      })
      .catch(() => {});
  }, [user]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const cleanName = displayName.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      setError("Display name must be between 2 and 40 characters.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateProfile(user, { displayName: cleanName });
      await saveUserProfile(user.uid, {
        displayName: cleanName,
        photoURL: user.photoURL && user.photoURL.startsWith("https://") ? user.photoURL : null,
        bio: bio.trim().slice(0, 240),
        createdAt,
        updatedAt: Date.now()
      });
      setFeedback("Profile saved.");
    } catch {
      setError("Could not update profile right now.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (loading) {
    return <Card className="p-6 text-sm text-ink-muted">Loading profile...</Card>;
  }

  if (!user) {
    return (
      <EmptyState
        icon={<UserRound className="h-6 w-6" aria-hidden="true" />}
        title="Sign in to manage your Profile"
        description="Customize your public reader name and sync your reading progress."
        action={
          <Link
            href="/auth?next=/profile"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Saved in Library</p>
            <p className="font-display text-2xl font-bold text-ink">{libraryCount}</p>
          </div>
          <Link
            href="/library"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"
            aria-label="Open Library"
          >
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Card>

        <Card className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Series Read</p>
            <p className="font-display text-2xl font-bold text-ink">{historyCount}</p>
          </div>
          <Link
            href="/history"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"
            aria-label="Open History"
          >
            <History className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="profile-display-name"
            label="Public display name"
            value={displayName}
            minLength={2}
            maxLength={40}
            required
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-bio" className="text-sm font-medium text-ink-secondary">
              Short bio
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={240}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Favorite genres or series..."
              className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent"
            />
            <span className="text-xs text-ink-muted">{bio.length}/240</span>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-status-danger">
              {error}
            </p>
          ) : null}
          {feedback ? (
            <p role="status" className="text-xs text-status-success">
              {feedback}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving..." : "Save profile"}
            </Button>

            <Button variant="secondary" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
