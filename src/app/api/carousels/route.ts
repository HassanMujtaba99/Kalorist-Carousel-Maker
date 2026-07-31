import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createCarousel, listCarousels } from "@/lib/server/carouselsRepo";
import type { CarouselState } from "@/lib/types";

export async function GET() {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ carousels: await listCarousels(user.id) });
}

export async function POST(req: NextRequest) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let carousel: CarouselState;
  try {
    carousel = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!carousel?.cover || !carousel?.cta) {
    return NextResponse.json({ error: "Malformed carousel payload." }, { status: 400 });
  }

  const id = await createCarousel(user.id, carousel);
  return NextResponse.json({ id });
}
