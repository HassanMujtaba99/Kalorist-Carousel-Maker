import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/auth";
import { deleteCarousel, getCarousel, updateCarousel } from "@/lib/server/carouselsRepo";
import type { CarouselState } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const carousel = await getCarousel(user.id, id);
  if (!carousel) {
    return NextResponse.json({ error: "Carousel not found." }, { status: 404 });
  }
  return NextResponse.json({ carousel });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  let carousel: CarouselState;
  try {
    carousel = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ok = await updateCarousel(user.id, id, carousel);
  if (!ok) {
    return NextResponse.json({ error: "Carousel not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteCarousel(user.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Carousel not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
