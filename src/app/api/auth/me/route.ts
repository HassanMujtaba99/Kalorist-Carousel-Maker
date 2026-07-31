import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getUserBySessionToken } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
