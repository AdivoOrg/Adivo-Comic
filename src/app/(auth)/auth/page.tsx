"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  mapAuthErrorMessage,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail
} from "@/lib/firebase/auth";
import { isSafeInternalRedirect } from "@/lib/validation/schemas";
import { getUserProfile, saveUserProfile } from "@/services/user-data";

type AuthMode = "signin" | "signup" | "reset";

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = isSafeInternalRedirect(searchParams.get("next"));

  const [mode, setMode] = useState<AuthMode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function ensureProfileInitialized(
    uid: string,
    rawName: string | null | undefined,
    rawPhoto: string | null | undefined
  ) {
    try {
      const existing = await getUserProfile(uid);
      if (existing) return;
      const cleanName =
        rawName && rawName.trim().length >= 2
          ? rawName.trim().slice(0, 40)
          : `Reader ${uid.slice(0, 6)}`;
      const now = Date.now();
      await saveUserProfile(uid, {
        displayName: cleanName,
        photoURL: rawPhoto && rawPhoto.startsWith("https://") ? rawPhoto.slice(0, 500) : null,
        bio: "",
        createdAt: now,
        updatedAt: now
      });
    } catch {
      return;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const cred = await signInWithEmail(email, password);
        await ensureProfileInitialized(cred.user.uid, cred.user.displayName, cred.user.photoURL);
        router.push(nextPath);
      } else if (mode === "signup") {
        const cred = await signUpWithEmail(email, password, displayName);
        await ensureProfileInitialized(cred.user.uid, displayName, cred.user.photoURL);
        router.push(nextPath);
      } else {
        await requestPasswordReset(email);
        setStatusMessage("Password reset link sent. Check your inbox.");
      }
    } catch (error) {
      setErrorMessage(mapAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setErrorMessage(null);
    setStatusMessage(null);
    setSubmitting(true);

    try {
      const cred = await signInWithGoogle();
      await ensureProfileInitialized(cred.user.uid, cred.user.displayName, cred.user.photoURL);
      router.push(nextPath);
    } catch (error) {
      setErrorMessage(mapAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card elevated className="w-full p-6 sm:p-8">
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold text-ink">
          {mode === "signin" && "Welcome back"}
          {mode === "signup" && "Create your account"}
          {mode === "reset" && "Reset password"}
        </h1>
        <p className="text-sm text-ink-secondary">
          {mode === "signin" && "Sign in to sync your library, reading history, and comments."}
          {mode === "signup" && "Start tracking chapters and join discussions on Adivo Comic."}
          {mode === "reset" && "Enter your email address to receive a password reset link."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <Input
            id="auth-display-name"
            label="Display name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your reader name"
          />
        ) : null}

        <Input
          id="auth-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="reader@example.com"
        />

        {mode !== "reset" ? (
          <Input
            id="auth-password"
            label="Password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        ) : null}

        {errorMessage ? (
          <p role="alert" className="rounded-xl bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {errorMessage}
          </p>
        ) : null}

        {statusMessage ? (
          <p role="status" className="rounded-xl bg-status-success/10 px-3.5 py-2.5 text-sm text-status-success">
            {statusMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {mode === "signin" && <Mail className="h-4 w-4" aria-hidden="true" />}
          {mode === "signup" && <User className="h-4 w-4" aria-hidden="true" />}
          {mode === "reset" && <Lock className="h-4 w-4" aria-hidden="true" />}
          {submitting
            ? "Please wait..."
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </Button>
      </form>

      {mode !== "reset" ? (
        <div className="mt-4">
          <Button
            variant="secondary"
            className="w-full"
            disabled={submitting}
            onClick={handleGoogleAuth}
          >
            Continue with Google
          </Button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-ink-secondary">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => setMode("signup")} className="font-medium text-accent hover:underline">
              Create an account
            </button>
            <button type="button" onClick={() => setMode("reset")} className="hover:text-ink">
              Forgot password?
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setMode("signin")} className="font-medium text-accent hover:underline">
            Back to sign in
          </button>
        )}
      </div>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <AuthFormContent />
    </Suspense>
  );
}
