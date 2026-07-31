import { StackServerApp } from "@stackframe/stack";

/**
 * Reads NEXT_PUBLIC_STACK_PROJECT_ID, NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
 * and STACK_SECRET_SERVER_KEY from the environment by convention. Get these
 * by enabling Neon Auth on your Neon project (Neon Console -> your project ->
 * Auth tab) — it provisions a Stack Auth project for you automatically.
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});
