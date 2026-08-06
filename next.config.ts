import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // RFC 8414 / RFC 9728 well-known discovery paths for the OAuth
      // authorization server MCP clients (e.g. claude.ai's Connectors UI)
      // probe when connecting — mapped to normal route handlers since a
      // literal ".well-known" segment isn't a convenient app/ directory name.
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/as-metadata" },
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/protected-resource" },
    ];
  },
};

export default nextConfig;
