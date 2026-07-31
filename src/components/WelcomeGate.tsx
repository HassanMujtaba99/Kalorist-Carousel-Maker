"use client";

import { useState } from "react";
import { AuthView } from "@neondatabase/auth-ui";
import { AuthWidgetBoundary } from "./AuthWidgetBoundary";
import { authViewClassNames } from "@/lib/authViewClassNames";

interface Props {
  onContinueAsGuest: () => void;
}

export function WelcomeGate({ onContinueAsGuest }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("signup");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Welcome to Carousel Maker
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Sign up or log in to save your API keys and carousels to your
          account, or continue as a guest — everything then stays in this
          browser only.
        </p>
      </div>

      <div className="kal-card flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "kal-pill" : "kal-btn-ghost"}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "kal-pill" : "kal-btn-ghost"}
          >
            Log in
          </button>
        </div>

        <AuthWidgetBoundary>
          <AuthView
            view={mode === "signup" ? "SIGN_UP" : "SIGN_IN"}
            classNames={authViewClassNames}
          />
        </AuthWidgetBoundary>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/15" />
        <span className="text-xs font-bold tracking-wide text-ink/40 uppercase">or</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>

      <button
        type="button"
        onClick={onContinueAsGuest}
        className="kal-btn-secondary mt-4 w-full"
      >
        Continue as guest
      </button>
      <p className="mt-2 text-center text-xs text-ink/45">
        No account, no data leaves your browser. You can sign up later
        without losing anything.
      </p>
    </div>
  );
}
