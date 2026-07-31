"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Stack Auth's embedded SignIn/SignUp components throw (as a render-phase
 * error, not just an unhandled promise) if they can't reach Stack's API —
 * network hiccup, outage, misconfigured keys. Without this boundary, that
 * takes down the whole page, including the "Continue as guest" fallback
 * that's supposed to work regardless of Stack Auth's availability.
 */
export class AuthWidgetBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Sign-in widget failed to load:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="rounded-xl border-2 border-dashed border-ink/20 p-4 text-center text-sm text-ink/60">
          Sign-in is temporarily unavailable. You can still continue as a
          guest below, or try again later.
        </p>
      );
    }
    return this.props.children;
  }
}
