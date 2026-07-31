import { Suspense } from "react";
import { CarouselBuilder } from "@/components/CarouselBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <Suspense fallback={<div className="p-8 text-center text-ink/50">Loading…</div>}>
        <CarouselBuilder />
      </Suspense>
    </div>
  );
}
