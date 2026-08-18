import { ImageLabBuilder } from "@/components/ImageLabBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function ImageLabPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <ImageLabBuilder />
    </div>
  );
}
