import type { NeonAuth } from "@neondatabase/auth/next/server";
import { auth } from "@/lib/auth/server";

type AuthHandlers = ReturnType<NeonAuth["handler"]>;

// auth.handler() constructs the real NeonAuth client (which needs
// NEON_AUTH_BASE_URL/NEON_AUTH_COOKIE_SECRET) as soon as it's called.
// Calling it here at module scope like `export const { GET, POST } =
// auth.handler()` would run during `next build`'s route-collection pass,
// failing the build on any environment without those vars set yet. Each
// exported method instead defers that call until a real request arrives.
let handlers: AuthHandlers | null = null;
function getHandlers(): AuthHandlers {
  if (!handlers) handlers = auth.handler();
  return handlers;
}

export const GET: AuthHandlers["GET"] = (...args) => getHandlers().GET(...args);
export const POST: AuthHandlers["POST"] = (...args) => getHandlers().POST(...args);
export const PUT: AuthHandlers["PUT"] = (...args) => getHandlers().PUT(...args);
export const DELETE: AuthHandlers["DELETE"] = (...args) => getHandlers().DELETE(...args);
export const PATCH: AuthHandlers["PATCH"] = (...args) => getHandlers().PATCH(...args);
