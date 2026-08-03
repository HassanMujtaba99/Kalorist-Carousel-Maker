"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useSettings } from "@/hooks/useSettings";
import { useGuestMode } from "@/hooks/useGuestMode";
import { WelcomeGate } from "./WelcomeGate";
import { PhotoCaptionRecreator } from "./recreate/PhotoCaptionRecreator";
import { ThisOrThatRecreator } from "./recreate/ThisOrThatRecreator";
import { DayOnAPlateRecreator } from "./recreate/DayOnAPlateRecreator";
import { BadgeTemplatePicker } from "./BadgeTemplatePicker";
import type { CarouselBrand } from "@/lib/types";

type Mode = "photo-caption" | "this-or-that" | "day-on-a-plate";

const MODES: { id: Mode; label: string }[] = [
  { id: "photo-caption", label: "Photo + Caption" },
  { id: "this-or-that", label: "This or That" },
  { id: "day-on-a-plate", label: "Day on a Plate" },
];

export function RecreateBuilder() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;
  const { guest, loaded: guestLoaded, continueAsGuest } = useGuestMode();
  const { settings, loaded } = useSettings(user?.id ?? null);
  const [mode, setMode] = useState<Mode>("photo-caption");
  const [brand, setBrand] = useState<CarouselBrand>({
    name: "MY COACHING",
    accentColor: "#22c55e",
    badgeTemplate: "pill",
  });

  if (sessionPending || !guestLoaded) return null;
  if (!user && !guest) {
    return <WelcomeGate onContinueAsGuest={continueAsGuest} />;
  }
  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Recreate from your photos
        </h1>
        <p className="max-w-2xl text-sm text-ink/60">
          Upload your own photos and let AI compose them into the same styled
          layouts as the main builder — a caption badge over a personal photo,
          or a food comparison with real USDA-verified numbers. Your API keys
          are shared with the{" "}
          <Link href="/" className="font-semibold text-purple underline">
            main Carousel Maker
          </Link>
          .
        </p>
      </header>

      {!settings.geminiApiKey.trim() && (
        <div className="kal-card !border-purple/40 !bg-purple/5 text-sm text-ink/70">
          Add your Gemini API key in{" "}
          <Link href="/" className="font-semibold text-purple underline">
            Settings on the main page
          </Link>{" "}
          first — it&apos;s shared across both pages.
        </div>
      )}

      <div className="kal-card !p-0 overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b-2 border-ink px-4 py-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={mode === m.id ? "kal-pill" : "kal-btn-ghost"}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="kal-label">Brand name (badge)</span>
              <input
                type="text"
                value={brand.name}
                onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
                className="kal-input"
              />
            </label>
            <BadgeTemplatePicker
              value={brand.badgeTemplate}
              onChange={(badgeTemplate) => setBrand((b) => ({ ...b, badgeTemplate }))}
            />
          </div>
          {mode === "photo-caption" && <PhotoCaptionRecreator settings={settings} brand={brand} />}
          {mode === "this-or-that" && <ThisOrThatRecreator settings={settings} brand={brand} />}
          {mode === "day-on-a-plate" && <DayOnAPlateRecreator settings={settings} brand={brand} />}
        </div>
      </div>
    </div>
  );
}
