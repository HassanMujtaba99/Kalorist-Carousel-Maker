"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kalorist:guest";

/**
 * Whether this browser has chosen to skip sign-in and use the tool as a
 * guest (BYOK, browser-only). Persisted so the welcome gate doesn't
 * reappear on every reload once dismissed.
 */
export function useGuestMode() {
  const [guest, setGuest] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuest(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore — localStorage may be unavailable (e.g. private browsing)
    }
    setLoaded(true);
  }, []);

  const continueAsGuest = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // best-effort; guest state still updates in memory below
    }
    setGuest(true);
  };

  return { guest, loaded, continueAsGuest };
}
