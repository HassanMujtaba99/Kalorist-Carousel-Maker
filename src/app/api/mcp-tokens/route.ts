import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createMcpToken, listMcpTokens } from "@/lib/server/mcpAuthRepo";

export async function GET() {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ tokens: await listMcpTokens(user.id) });
}

export async function POST(req: NextRequest) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let label = "MCP token";
  try {
    const body = await req.json();
    if (typeof body?.label === "string" && body.label.trim()) {
      label = body.label.trim().slice(0, 100);
    }
  } catch {
    // No body / not JSON — fine, use the default label.
  }

  const { id, token } = await createMcpToken(user.id, label);
  return NextResponse.json({ id, token, label });
}
