import { StudioBuilder } from "@/components/StudioBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <StudioBuilder />
    </div>
  );
}
