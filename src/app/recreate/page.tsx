import { RecreateBuilder } from "@/components/RecreateBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function RecreatePage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <RecreateBuilder />
    </div>
  );
}
