import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { deleteMcpImage, getMcpImageBytes, renameMcpImage } from "@/lib/server/mcpImagesRepo";

interface RouteContext {
  params: Promise<{ tag: string }>;
}

/** Serves the actual image bytes (e.g. for a thumbnail <img src>), scoped to the signed-in owner. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { tag } = await params;
  const image = await getMcpImageBytes(user.id, tag);
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { tag } = await params;

  let label: string;
  try {
    const body = await req.json();
    label = typeof body?.label === "string" ? body.label.trim().slice(0, 100) : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }

  const ok = await renameMcpImage(user.id, tag, label);
  if (!ok) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
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
