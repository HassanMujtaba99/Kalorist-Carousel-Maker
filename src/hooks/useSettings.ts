"use client";

import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "@/lib/types";

const STORAGE_KEY = "kalorist:settings";

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash-image",
  usdaApiKey: "",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-5",
};

function loadLocalSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore malformed local storage
  }
  return DEFAULT_SETTINGS;
}

/**
 * Settings persist to localStorage when signed out (the original BYOK
 * behavior — nothing ever leaves the browser), and to the encrypted
 * server-side account once signed in (userId set). Passing a userId that
 * just became non-null triggers a one-time sync: adopt the account's saved
 * settings if it has any, otherwise push the current (possibly anonymous)
 * settings up to seed the account.
 */
export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadLocalSettings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !userId || syncedUserId.current === userId) return;
    syncedUserId.current = userId;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...json.settings });
        } else {
          await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
          });
        }
      } catch {
        // account sync is best-effort; local state stays usable either way
      }
    })();
    // Deliberately omitting `settings` — this should only re-run when the
    // signed-in user changes, using whatever settings were current at that
    // moment (either freshly loaded locally, or already synced).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!userId) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // storage may be unavailable (e.g. private browsing) — keep in memory
      }
      return;
    }
    const timeout = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }).catch(() => {
        // best-effort; user's in-memory state is unaffected
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [settings, userId, loaded]);

  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return { settings, update, loaded };
}
