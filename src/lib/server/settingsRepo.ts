import { ensureSchema, sql } from "./db";
import { encryptField, decryptField } from "./crypto";
import type { AppSettings } from "@/lib/types";

interface UserSettingsRow {
  gemini_api_key_enc: string | null;
  gemini_model: string | null;
  usda_api_key_enc: string | null;
  anthropic_api_key_enc: string | null;
  anthropic_model: string | null;
}

export async function getUserSettings(userId: string): Promise<AppSettings | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT gemini_api_key_enc, gemini_model, usda_api_key_enc, anthropic_api_key_enc, anthropic_model
    FROM user_settings WHERE user_id = ${userId}
  `) as UserSettingsRow[];

  const row = rows[0];
  if (!row) return null;

  return {
    geminiApiKey: decryptField(row.gemini_api_key_enc),
    geminiModel: row.gemini_model ?? "",
    usdaApiKey: decryptField(row.usda_api_key_enc),
    anthropicApiKey: decryptField(row.anthropic_api_key_enc),
    anthropicModel: row.anthropic_model ?? "",
  };
}

export async function saveUserSettings(
  userId: string,
  settings: AppSettings
): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO user_settings
      (user_id, gemini_api_key_enc, gemini_model, usda_api_key_enc, anthropic_api_key_enc, anthropic_model, updated_at)
    VALUES (
      ${userId},
      ${encryptField(settings.geminiApiKey)},
      ${settings.geminiModel},
      ${encryptField(settings.usdaApiKey)},
      ${encryptField(settings.anthropicApiKey)},
      ${settings.anthropicModel},
      ${Date.now()}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      gemini_api_key_enc = excluded.gemini_api_key_enc,
      gemini_model = excluded.gemini_model,
      usda_api_key_enc = excluded.usda_api_key_enc,
      anthropic_api_key_enc = excluded.anthropic_api_key_enc,
      anthropic_model = excluded.anthropic_model,
      updated_at = excluded.updated_at
  `;
}
