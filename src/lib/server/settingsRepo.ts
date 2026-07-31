import { getDb } from "./db";
import { encryptField, decryptField } from "./crypto";
import type { AppSettings } from "@/lib/types";

interface UserSettingsRow {
  gemini_api_key_enc: string | null;
  gemini_model: string | null;
  usda_api_key_enc: string | null;
  anthropic_api_key_enc: string | null;
  anthropic_model: string | null;
}

export function getUserSettings(userId: string): AppSettings | null {
  const row = getDb()
    .prepare(
      `SELECT gemini_api_key_enc, gemini_model, usda_api_key_enc, anthropic_api_key_enc, anthropic_model
       FROM user_settings WHERE user_id = ?`
    )
    .get(userId) as UserSettingsRow | undefined;

  if (!row) return null;

  return {
    geminiApiKey: decryptField(row.gemini_api_key_enc),
    geminiModel: row.gemini_model ?? "",
    usdaApiKey: decryptField(row.usda_api_key_enc),
    anthropicApiKey: decryptField(row.anthropic_api_key_enc),
    anthropicModel: row.anthropic_model ?? "",
  };
}

export function saveUserSettings(userId: string, settings: AppSettings): void {
  getDb()
    .prepare(
      `INSERT INTO user_settings
         (user_id, gemini_api_key_enc, gemini_model, usda_api_key_enc, anthropic_api_key_enc, anthropic_model, updated_at)
       VALUES (@userId, @geminiApiKeyEnc, @geminiModel, @usdaApiKeyEnc, @anthropicApiKeyEnc, @anthropicModel, @updatedAt)
       ON CONFLICT(user_id) DO UPDATE SET
         gemini_api_key_enc = excluded.gemini_api_key_enc,
         gemini_model = excluded.gemini_model,
         usda_api_key_enc = excluded.usda_api_key_enc,
         anthropic_api_key_enc = excluded.anthropic_api_key_enc,
         anthropic_model = excluded.anthropic_model,
         updated_at = excluded.updated_at`
    )
    .run({
      userId,
      geminiApiKeyEnc: encryptField(settings.geminiApiKey),
      geminiModel: settings.geminiModel,
      usdaApiKeyEnc: encryptField(settings.usdaApiKey),
      anthropicApiKeyEnc: encryptField(settings.anthropicApiKey),
      anthropicModel: settings.anthropicModel,
      updatedAt: Date.now(),
    });
}
