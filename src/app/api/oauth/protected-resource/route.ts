import { NextRequest, NextResponse } from "next/server";
import { generateProtectedResourceMetadata, getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

/** RFC 9728 Protected Resource Metadata — served at /.well-known/oauth-protected-resource via next.config.ts rewrite. */
export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  });
  return NextResponse.json(metadata);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
