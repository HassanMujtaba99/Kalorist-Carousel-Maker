"use client";

import type { Slide, SlideData } from "@/lib/types";
import { TitleSlideEditor } from "./editors/TitleSlideEditor";
import { ThisOrThatSlideEditor } from "./editors/ThisOrThatSlideEditor";
import { DayOnAPlateSlideEditor } from "./editors/DayOnAPlateSlideEditor";
import { CtaSlideEditor } from "./editors/CtaSlideEditor";

interface Props {
  slide: Slide;
  usdaApiKey: string;
  onChange: (data: SlideData) => void;
}

export function SlideEditor({ slide, usdaApiKey, onChange }: Props) {
  switch (slide.data.kind) {
    case "title":
      return <TitleSlideEditor data={slide.data} onChange={onChange} />;
    case "this-or-that":
      return (
        <ThisOrThatSlideEditor
          data={slide.data}
          usdaApiKey={usdaApiKey}
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
    case "cta":
      return <CtaSlideEditor data={slide.data} onChange={onChange} />;
  }
}
