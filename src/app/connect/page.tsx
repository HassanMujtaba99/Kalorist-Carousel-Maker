import { ConnectClaudeBuilder } from "@/components/ConnectClaudeBuilder";
import { SiteHeader } from "@/components/SiteHeader";

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <ConnectClaudeBuilder />
    </div>
  );
}
