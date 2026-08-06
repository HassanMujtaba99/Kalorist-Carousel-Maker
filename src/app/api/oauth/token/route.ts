import { NextRequest, NextResponse } from "next/server";
import { consumeAuthCode, verifyPkce } from "@/lib/server/oauthRepo";
import { createMcpToken } from "@/lib/server/mcpAuthRepo";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function tokenError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: CORS_HEADERS });
}

/**
 * Token endpoint (RFC 6749 §3.2 + PKCE verification). Mints the access
 * token via the app's existing createMcpToken() — it's a normal Kalorist MCP
 * token from that point on, verified the same way at /api/mcp regardless of
 * whether it came from this OAuth flow or the "Connect Claude" panel's
 * "Generate token" button.
 */
export async function POST(req: NextRequest) {
  let params: URLSearchParams;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    params = new URLSearchParams(await req.text());
  } else if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    params = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v ?? "")]));
  } else {
    return tokenError("invalid_request", "Expected application/x-www-form-urlencoded or application/json body.");
  }

  const grantType = params.get("grant_type");
  if (grantType !== "authorization_code") {
    return tokenError("unsupported_grant_type", "Only grant_type=authorization_code is supported.");
  }

  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const codeVerifier = params.get("code_verifier");
  const clientId = params.get("client_id");
  if (!code || !redirectUri || !codeVerifier) {
    return tokenError("invalid_request", "code, redirect_uri, and code_verifier are required.");
  }

  const consumed = await consumeAuthCode(code);
  if (!consumed) {
    return tokenError("invalid_grant", "This code is invalid, expired, or already used.");
  }
  if (consumed.redirectUri !== redirectUri) {
    return tokenError("invalid_grant", "redirect_uri does not match the one used to request this code.");
  }
  if (clientId && consumed.clientId !== clientId) {
    return tokenError("invalid_grant", "client_id does not match this code.");
  }
  if (!verifyPkce(codeVerifier, consumed.codeChallenge)) {
    return tokenError("invalid_grant", "code_verifier does not match the original code_challenge.");
  }

  const { token } = await createMcpToken(consumed.userId, "claude.ai (OAuth)");
  return NextResponse.json(
    { access_token: token, token_type: "Bearer", scope: "" },
    { status: 200, headers: CORS_HEADERS }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
