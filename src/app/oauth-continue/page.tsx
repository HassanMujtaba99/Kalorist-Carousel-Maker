"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Bounce page for the OAuth sign-in flow. The auth UI's post-login redirect
 * (`navigate`, wired to Next's client router in providers.tsx) does a soft
 * client-side transition — fine for pages, but /api/oauth/authorize is a
 * Route Handler with no page component, so a soft navigation there silently
 * fails and lands back on the previous screen. This page is a real,
 * client-navigable target: it immediately forces a full browser navigation
 * (window.location, not the router) to the actual destination, which is the
 * only way to guarantee a real HTTP request with the fresh session cookie
 * reaches a Route Handler.
 */
function Continue() {
  const params = useSearchParams();
  const to = params.get("to");

  useEffect(() => {
    // Same-origin relative paths only — this value round-trips through a
    // client-visible query param, so anything else would be an open redirect.
    if (to && to.startsWith("/") && !to.startsWith("//")) {
      window.location.replace(to);
    }
  }, [to]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 text-sm text-ink/60">
      Connecting…
    </div>
  );
}

export default function OAuthContinuePage() {
  return (
    <Suspense fallback={null}>
      <Continue />
    </Suspense>
  );
}
