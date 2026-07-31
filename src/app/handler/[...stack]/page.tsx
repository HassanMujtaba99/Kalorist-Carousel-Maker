import { StackHandler } from "@stackframe/stack";

/**
 * Catch-all route for Stack Auth's hosted pages (OAuth callback, account
 * settings, password reset, etc). The in-app Account panel embeds SignIn/
 * SignUp directly, so most users never see this page — it's a fallback for
 * flows that need a full page (e.g. the Google/Apple OAuth redirect).
 */
export default function Handler() {
  return <StackHandler fullPage />;
}
