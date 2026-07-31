import crypto from "node:crypto";
import { ensureSchema, sql } from "./db";
import type { CarouselState } from "@/lib/types";

interface CarouselRow {
  id: string;
  title: string;
  data_json: string;
}

export interface CarouselSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export async function listCarousels(userId: string): Promise<CarouselSummary[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title, updated_at FROM carousels WHERE user_id = ${userId} ORDER BY updated_at DESC
  `) as { id: string; title: string; updated_at: number }[];
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: Number(r.updated_at) }));
}

export async function getCarousel(
  userId: string,
  id: string
): Promise<(CarouselState & { id: string }) | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title, data_json FROM carousels WHERE id = ${id} AND user_id = ${userId}
  `) as CarouselRow[];
  const row = rows[0];
  if (!row) return null;
  const data = JSON.parse(row.data_json) as CarouselState;
  return { ...data, id: row.id };
}

export async function createCarousel(
  userId: string,
  carousel: CarouselState
): Promise<string> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const now = Date.now();
  await sql()`
    INSERT INTO carousels (id, user_id, title, data_json, created_at, updated_at)
    VALUES (${id}, ${userId}, ${carousel.title || "Untitled Carousel"}, ${JSON.stringify(carousel)}, ${now}, ${now})
  `;
  return id;
}

export async function updateCarousel(
  userId: string,
  id: string,
  carousel: CarouselState
): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    UPDATE carousels SET title = ${carousel.title || "Untitled Carousel"}, data_json = ${JSON.stringify(carousel)}, updated_at = ${Date.now()}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function deleteCarousel(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    DELETE FROM carousels WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}
