import { NextRequest, NextResponse } from "next/server";
import { registerClient } from "@/lib/server/oauthRepo";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** RFC 7591 Dynamic Client Registration — public clients only (no client_secret; PKCE is the proof at /token). */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS_HEADERS });
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  for (const uri of redirectUris) {
    try {
      new URL(uri);
    } catch {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: `Not a valid URL: ${uri}` },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 200) : "MCP Client";
  const client = await registerClient(clientName, redirectUris);

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS_HEADERS }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
