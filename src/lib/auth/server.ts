import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

/**
 * Reads NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET from the environment.
 * Get the base URL from the Neon Console (Project -> Auth tab -> Configuration)
 * after enabling Managed Better Auth; generate the cookie secret with
 * `openssl rand -base64 32` (must be at least 32 characters).
 */
function buildAuth(): NeonAuth {
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
  });
}

let instance: NeonAuth | null = null;

// createNeonAuth validates cookies.secret eagerly and throws if it's
// missing/too short. Every route.ts file that imports `auth` gets executed
// at build time (Next.js collects each route's exported HTTP methods), so
// constructing it at module scope means `next build` fails on any
// environment where the auth env vars aren't set yet — this Proxy defers
// construction to first actual use (a real request) instead.
export const auth: NeonAuth = new Proxy({} as NeonAuth, {
  get(_target, prop, receiver) {
    if (!instance) instance = buildAuth();
    return Reflect.get(instance as object, prop, receiver);
  },
});
