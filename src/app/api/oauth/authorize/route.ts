import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "mcp-handler";
import { auth } from "@/lib/auth/server";
import { getClient } from "@/lib/server/oauthRepo";
import { escapeHtml, renderOAuthPage } from "@/lib/server/oauthPage";

function htmlError(title: string, detail: string, status = 400) {
  return new NextResponse(renderOAuthPage(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p>`), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Authorization endpoint (RFC 6749 §3.1 + PKCE). Errors here are shown
 * inline rather than redirected, since the redirect_uri hasn't been
 * validated against the client yet at that point — redirecting to an
 * unverified URL is the classic open-redirect mistake this avoids.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const responseType = params.get("response_type");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state") ?? "";

  if (responseType !== "code") {
    return htmlError("Unsupported request", "Only the 'code' response_type is supported.");
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return htmlError("Missing parameters", "client_id, redirect_uri, and code_challenge are required.");
  }
  if (codeChallengeMethod !== "S256") {
    return htmlError("Unsupported PKCE method", "Only code_challenge_method=S256 is supported.");
  }

  const client = await getClient(clientId);
  if (!client) {
    return htmlError("Unknown client", "This app isn't registered. Try reconnecting from Claude.", 400);
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return htmlError("Redirect URI mismatch", "This redirect address wasn't registered for this app.", 400);
  }

  const { data } = await auth.getSession();
  const user = data?.user;

  if (!user) {
    const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    const signInUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(new URL(signInUrl, getPublicOrigin(req)));
  }

  const denyUrl = `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ""}`;

  const body = `
    <h1>Connect Claude to Kalorist Carousel Maker</h1>
    <p><span class="account">${escapeHtml(client.clientName)}</span> wants to access your
    Kalorist account (<span class="account">${escapeHtml(user.email ?? user.id)}</span>) —
    it'll be able to use your saved API keys and save carousels to
    <strong>My Carousels</strong> on your behalf.</p>
    <form method="POST" action="/api/oauth/authorize/approve">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <div class="actions">
        <a class="btn btn-ghost" href="${escapeHtml(denyUrl)}">Cancel</a>
        <button class="btn-primary" type="submit">Allow</button>
      </div>
    </form>
  `;
  return new NextResponse(renderOAuthPage("Connect Claude", body), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
