"use client";

import type { AppSettings, Slide, SlideData } from "@/lib/types";
import { TitleSlideEditor } from "./editors/TitleSlideEditor";
import { ThisOrThatSlideEditor } from "./editors/ThisOrThatSlideEditor";
import { DayOnAPlateSlideEditor } from "./editors/DayOnAPlateSlideEditor";
import { ProteinSwapSlideEditor } from "./editors/ProteinSwapSlideEditor";
import { CtaSlideEditor } from "./editors/CtaSlideEditor";

interface Props {
  slide: Slide;
  usdaApiKey: string;
  settings: AppSettings;
  onChange: (data: SlideData) => void;
}

export function SlideEditor({ slide, usdaApiKey, settings, onChange }: Props) {
  switch (slide.data.kind) {
    case "title":
      return <TitleSlideEditor data={slide.data} settings={settings} onChange={onChange} />;
    case "this-or-that":
      return (
        <ThisOrThatSlideEditor
          data={slide.data}
          usdaApiKey={usdaApiKey}
          settings={settings}
          onChange={onChange}
        />
      );
    case "day-on-a-plate":
      return (
        <DayOnAPlateSlideEditor
          data={slide.data}
          usdaApiKey={usdaApiKey}
          onChange={onChange}
        />
      );
    case "protein-swap":
      return (
        <ProteinSwapSlideEditor
          data={slide.data}
          usdaApiKey={usdaApiKey}
          settings={settings}
          onChange={onChange}
        />
      );
    case "cta":
      return <CtaSlideEditor data={slide.data} settings={settings} onChange={onChange} />;
  }
}
