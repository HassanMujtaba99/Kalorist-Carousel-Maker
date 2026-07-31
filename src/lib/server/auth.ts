import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { ensureSchema, sql } from "./db";

export const SESSION_COOKIE = "kalorist_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface User {
  id: string;
  email: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, email, password_hash FROM users WHERE email = ${email.trim().toLowerCase()}
  `) as UserRow[];
  return rows[0];
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();
  await sql()`
    INSERT INTO users (id, email, password_hash, created_at)
    VALUES (${id}, ${normalizedEmail}, ${passwordHash}, ${Date.now()})
  `;
  return { id, email: normalizedEmail };
}

export async function authenticate(
  email: string,
  password: string
): Promise<User | null> {
  const row = await findUserByEmail(email);
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, email: row.email };
}

export async function createSession(userId: string): Promise<string> {
  await ensureSchema();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  await sql()`
    INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})
  `;
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await ensureSchema();
  await sql()`DELETE FROM sessions WHERE token = ${token}`;
}

export async function getUserBySessionToken(
  token: string | undefined
): Promise<User | null> {
  if (!token) return null;
  await ensureSchema();
  const rows = (await sql()`
    SELECT u.id, u.email, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `) as { id: string; email: string; expires_at: number }[];

  const row = rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return { id: row.id, email: row.email };
}

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  return getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}
