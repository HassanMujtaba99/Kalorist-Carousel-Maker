"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/lib/types";

const STORAGE_KEY = "kalorist:settings";

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash-image",
  usdaApiKey: "",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-5",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Hydrating client state from localStorage on mount — this is the one
    // legitimate case for setState-in-effect (localStorage is unavailable
    // during SSR, so it can't be read in a lazy initializer).
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      }
    } catch {
      // ignore malformed local storage
    } finally {
      setLoaded(true);
    }
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage may be unavailable (e.g. private browsing) — keep in memory
      }
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
