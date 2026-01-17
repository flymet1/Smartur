import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import type { AgencyInfo } from "@shared/schema";

interface LayoutProps {
  children: React.ReactNode;
  agency?: AgencyInfo;
}

export function Layout({ children, agency }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header agencyName={agency?.name} logo={agency?.logo} />
      <main className="flex-1">{children}</main>
      <Footer agency={agency} />
      {agency?.whatsapp && <WhatsAppButton phone={agency.whatsapp} />}
    </div>
  );
}
