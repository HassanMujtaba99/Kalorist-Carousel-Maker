"use client";

import { useState } from "react";
import { AuthView } from "@neondatabase/auth-ui";
import { AuthWidgetBoundary } from "./AuthWidgetBoundary";
import { authViewClassNames } from "@/lib/authViewClassNames";

interface AuthPanelUser {
  email: string;
  name: string;
}

interface Props {
  user: AuthPanelUser | null;
  onSignOut: () => void;
}

export function AuthPanel({ user, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  if (user) {
    return (
      <div className="kal-card flex items-center justify-between !py-3">
        <span className="text-sm">
          Signed in as{" "}
          <span className="font-bold text-ink">{user.name || user.email}</span> —
          your API keys and saved carousels sync to this account.
        </span>
        <button type="button" onClick={onSignOut} className="kal-btn-ghost">
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
        <div className="space-y-4 border-t-2 border-ink px-4 py-4">
          <p className="text-sm text-ink/60">
            Optional. Sign in with Google (or email) to save your API keys and
            carousels to this server (encrypted at rest) instead of just this
            browser.
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

          <AuthWidgetBoundary>
            <AuthView
              view={mode === "signup" ? "SIGN_UP" : "SIGN_IN"}
              classNames={authViewClassNames}
            />
          </AuthWidgetBoundary>
        </div>
      )}
    </div>
  );
}
