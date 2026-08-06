import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

/** RFC 8414 Authorization Server Metadata — served at /.well-known/oauth-authorization-server via next.config.ts rewrite. */
export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [],
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
