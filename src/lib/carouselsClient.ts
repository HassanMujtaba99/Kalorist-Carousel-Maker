import type { CarouselState } from "./types";

export interface CarouselSummary {
  id: string;
  title: string;
  updatedAt: number;
}

async function parseJsonOrThrow(res: Response): Promise<Record<string, unknown>> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json.error as string) || `Request failed (${res.status})`);
  }
  return json;
}

export async function listSavedCarousels(): Promise<CarouselSummary[]> {
  const res = await fetch("/api/carousels");
  const json = await parseJsonOrThrow(res);
  return (json.carousels ?? []) as CarouselSummary[];
}

export async function loadSavedCarousel(
  id: string
): Promise<CarouselState & { id: string }> {
  const res = await fetch(`/api/carousels/${id}`);
  const json = await parseJsonOrThrow(res);
  return json.carousel as CarouselState & { id: string };
}

export async function createSavedCarousel(carousel: CarouselState): Promise<string> {
  const res = await fetch("/api/carousels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carousel),
  });
  const json = await parseJsonOrThrow(res);
  return json.id as string;
}

export async function updateSavedCarousel(
  id: string,
  carousel: CarouselState
): Promise<void> {
  const res = await fetch(`/api/carousels/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carousel),
  });
  await parseJsonOrThrow(res);
}

export async function deleteSavedCarousel(id: string): Promise<void> {
  const res = await fetch(`/api/carousels/${id}`, { method: "DELETE" });
  await parseJsonOrThrow(res);
}
