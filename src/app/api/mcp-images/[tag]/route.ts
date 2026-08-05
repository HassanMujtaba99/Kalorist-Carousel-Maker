import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { deleteMcpImage } from "@/lib/server/mcpImagesRepo";

interface RouteContext {
  params: Promise<{ tag: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { tag } = await params;
  const ok = await deleteMcpImage(user.id, tag);
  if (!ok) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
