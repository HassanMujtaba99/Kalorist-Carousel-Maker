import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { revokeMcpToken } from "@/lib/server/mcpAuthRepo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const ok = await revokeMcpToken(user.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
