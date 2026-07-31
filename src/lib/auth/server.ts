import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Reads NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET from the environment.
 * Get the base URL from the Neon Console (Project -> Auth tab -> Configuration)
 * after enabling Managed Better Auth; generate the cookie secret with
 * `openssl rand -base64 32` (must be at least 32 characters).
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
