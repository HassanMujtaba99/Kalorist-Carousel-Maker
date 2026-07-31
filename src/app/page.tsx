import { CarouselBuilder } from "@/components/CarouselBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <CarouselBuilder />
    </div>
  );
}
