import crypto from "node:crypto";
import { getDb } from "./db";
import type { CarouselState } from "@/lib/types";

interface CarouselRow {
  id: string;
  title: string;
  data_json: string;
  created_at: number;
  updated_at: number;
}

export interface CarouselSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export function listCarousels(userId: string): CarouselSummary[] {
  const rows = getDb()
    .prepare(
      "SELECT id, title, updated_at FROM carousels WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(userId) as { id: string; title: string; updated_at: number }[];
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

export function getCarousel(
  userId: string,
  id: string
): (CarouselState & { id: string }) | null {
  const row = getDb()
    .prepare("SELECT id, title, data_json FROM carousels WHERE id = ? AND user_id = ?")
    .get(id, userId) as CarouselRow | undefined;
  if (!row) return null;
  const data = JSON.parse(row.data_json) as CarouselState;
  return { ...data, id: row.id };
}

export function createCarousel(userId: string, carousel: CarouselState): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO carousels (id, user_id, title, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, userId, carousel.title || "Untitled Carousel", JSON.stringify(carousel), now, now);
  return id;
}

export function updateCarousel(
  userId: string,
  id: string,
  carousel: CarouselState
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE carousels SET title = ?, data_json = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(carousel.title || "Untitled Carousel", JSON.stringify(carousel), Date.now(), id, userId);
  return result.changes > 0;
}

export function deleteCarousel(userId: string, id: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM carousels WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}
