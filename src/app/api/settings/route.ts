import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/auth";
import { getUserSettings, saveUserSettings } from "@/lib/server/settingsRepo";
import type { AppSettings } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const settings = getUserSettings(user.id);
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Partial<AppSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const settings: AppSettings = {
    geminiApiKey: body.geminiApiKey ?? "",
    geminiModel: body.geminiModel ?? "",
    usdaApiKey: body.usdaApiKey ?? "",
    anthropicApiKey: body.anthropicApiKey ?? "",
    anthropicModel: body.anthropicModel ?? "",
  };

  saveUserSettings(user.id, settings);
  return NextResponse.json({ settings });
}
