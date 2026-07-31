"use client";

import { useState } from "react";
import type { AuthUser } from "@/hooks/useAuth";

interface Props {
  user: AuthUser | null;
  loaded: boolean;
  onSignup: (email: string, password: string) => Promise<AuthUser>;
  onLogin: (email: string, password: string) => Promise<AuthUser>;
  onLogout: () => Promise<void>;
}

export function AuthPanel({ user, loaded, onSignup, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loaded) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await onSignup(email, password);
      } else {
        await onLogin(email, password);
      }
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="kal-card flex items-center justify-between !py-3">
        <span className="text-sm">
          Signed in as <span className="font-bold text-ink">{user.email}</span> —
          your API keys and saved carousels sync to this account.
        </span>
        <button type="button" onClick={() => onLogout()} className="kal-btn-ghost">
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="kal-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-bold text-ink">Account</span>
        <span className="text-sm font-semibold text-purple">
          {open ? "Hide" : "Log in / sign up"}
        </span>
      </button>

      {open && (
        <form onSubmit={submit} className="space-y-4 border-t-2 border-ink px-4 py-4">
          <p className="text-sm text-ink/60">
            Optional. Create an account to save your API keys and carousels to
            this server (encrypted at rest) instead of just this browser.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={mode === "login" ? "kal-pill" : "kal-btn-ghost"}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={mode === "signup" ? "kal-pill" : "kal-btn-ghost"}
            >
              Create account
            </button>
          </div>

          <label className="block text-sm">
            <span className="kal-label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="kal-input"
            />
          </label>
          <label className="block text-sm">
            <span className="kal-label">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : undefined}
              className="kal-input"
            />
          </label>

          {error && <p className="text-xs font-semibold text-purple">{error}</p>}

          <button type="submit" disabled={busy} className="kal-btn-primary">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
      )}
    </div>
  );
}
