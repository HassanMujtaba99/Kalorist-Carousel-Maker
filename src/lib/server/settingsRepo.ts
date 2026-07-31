import { ensureSchema, sql } from "./db";
import { encryptField, decryptField } from "./crypto";
import type { AppSettings, CopyProvider } from "@/lib/types";

interface UserSettingsRow {
  gemini_api_key_enc: string | null;
  gemini_model: string | null;
  usda_api_key_enc: string | null;
  anthropic_api_key_enc: string | null;
  anthropic_model: string | null;
  copy_provider: string | null;
  gemini_copy_model: string | null;
  openai_api_key_enc: string | null;
  openai_model: string | null;
  custom_api_key_enc: string | null;
  custom_model: string | null;
  custom_base_url: string | null;
}

const VALID_COPY_PROVIDERS: CopyProvider[] = ["anthropic", "gemini", "openai", "custom"];

function toCopyProvider(value: string | null): CopyProvider {
  return VALID_COPY_PROVIDERS.includes(value as CopyProvider)
    ? (value as CopyProvider)
    : "anthropic";
}

export async function getUserSettings(userId: string): Promise<AppSettings | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT gemini_api_key_enc, gemini_model, usda_api_key_enc,
           anthropic_api_key_enc, anthropic_model,
           copy_provider, gemini_copy_model,
           openai_api_key_enc, openai_model,
           custom_api_key_enc, custom_model, custom_base_url
    FROM user_settings WHERE user_id = ${userId}
  `) as UserSettingsRow[];

  const row = rows[0];
  if (!row) return null;

  return {
    geminiApiKey: decryptField(row.gemini_api_key_enc),
    geminiModel: row.gemini_model ?? "",
    usdaApiKey: decryptField(row.usda_api_key_enc),
    copyProvider: toCopyProvider(row.copy_provider),
    anthropicApiKey: decryptField(row.anthropic_api_key_enc),
    anthropicModel: row.anthropic_model ?? "",
    geminiCopyModel: row.gemini_copy_model ?? "",
    openaiApiKey: decryptField(row.openai_api_key_enc),
    openaiModel: row.openai_model ?? "",
    customApiKey: decryptField(row.custom_api_key_enc),
    customModel: row.custom_model ?? "",
    customBaseUrl: row.custom_base_url ?? "",
  };
}

export async function saveUserSettings(
  userId: string,
  settings: AppSettings
): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO user_settings
      (user_id, gemini_api_key_enc, gemini_model, usda_api_key_enc,
       anthropic_api_key_enc, anthropic_model,
       copy_provider, gemini_copy_model,
       openai_api_key_enc, openai_model,
       custom_api_key_enc, custom_model, custom_base_url,
       updated_at)
    VALUES (
      ${userId},
      ${encryptField(settings.geminiApiKey)},
      ${settings.geminiModel},
      ${encryptField(settings.usdaApiKey)},
      ${encryptField(settings.anthropicApiKey)},
      ${settings.anthropicModel},
      ${settings.copyProvider},
      ${settings.geminiCopyModel},
      ${encryptField(settings.openaiApiKey)},
      ${settings.openaiModel},
      ${encryptField(settings.customApiKey)},
      ${settings.customModel},
      ${settings.customBaseUrl},
      ${Date.now()}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      gemini_api_key_enc = excluded.gemini_api_key_enc,
      gemini_model = excluded.gemini_model,
      usda_api_key_enc = excluded.usda_api_key_enc,
      anthropic_api_key_enc = excluded.anthropic_api_key_enc,
      anthropic_model = excluded.anthropic_model,
      copy_provider = excluded.copy_provider,
      gemini_copy_model = excluded.gemini_copy_model,
      openai_api_key_enc = excluded.openai_api_key_enc,
      openai_model = excluded.openai_model,
      custom_api_key_enc = excluded.custom_api_key_enc,
      custom_model = excluded.custom_model,
      custom_base_url = excluded.custom_base_url,
      updated_at = excluded.updated_at
  `;
}
