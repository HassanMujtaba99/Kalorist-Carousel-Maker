import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "mcp-handler";
import { auth } from "@/lib/auth/server";
import { createAuthCode, getClient } from "@/lib/server/oauthRepo";
import { escapeHtml, renderOAuthPage } from "@/lib/server/oauthPage";

function htmlError(title: string, detail: string, status = 400) {
  return new NextResponse(renderOAuthPage(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p>`), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Handles the consent form submit from /api/oauth/authorize — re-validates everything server-side before minting a code. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const clientId = form.get("client_id");
  const redirectUri = form.get("redirect_uri");
  const codeChallenge = form.get("code_challenge");
  const state = form.get("state");

  if (
    typeof clientId !== "string" ||
    typeof redirectUri !== "string" ||
    typeof codeChallenge !== "string" ||
    typeof state !== "string"
  ) {
    return htmlError("Malformed request", "Missing form fields.");
  }

  const client = await getClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return htmlError("Invalid request", "This app or redirect address is no longer valid. Try reconnecting from Claude.");
  }

  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    const returnTo = `/api/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&response_type=code&state=${encodeURIComponent(state)}`;
    return NextResponse.redirect(
      new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(returnTo)}`, getPublicOrigin(req))
    );
  }

  const code = await createAuthCode(user.id, clientId, redirectUri, codeChallenge);
  const separator = redirectUri.includes("?") ? "&" : "?";
  const dest = `${redirectUri}${separator}code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;
  return NextResponse.redirect(dest, { status: 303 });
}
