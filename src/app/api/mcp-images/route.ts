import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { listMcpImages, saveMcpImage } from "@/lib/server/mcpImagesRepo";

// Keeps individual rows reasonable — this is a Postgres text column, not object storage.
const MAX_DATA_URL_LENGTH = 12_000_000; // ~8.7MB decoded

export async function GET() {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ images: await listMcpImages(user.id) });
}

export async function POST(req: NextRequest) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let dataUrl: string;
  try {
    const body = await req.json();
    dataUrl = body?.dataUrl;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Expected a data:image/...;base64,... URL." }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Image is too large (max ~8MB)." }, { status: 400 });
  }

  try {
    const tag = await saveMcpImage(user.id, dataUrl);
    return NextResponse.json({ tag });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 }
    );
  }
}
