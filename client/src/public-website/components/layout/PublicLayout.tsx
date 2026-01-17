import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import type { PublicWebsiteData } from "../../types";

interface PublicLayoutProps {
  children: React.ReactNode;
  data?: PublicWebsiteData;
}

export function PublicLayout({ children, data }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader 
        agencyName={data?.name} 
        logo={data?.logoUrl || undefined} 
        phone={data?.websiteContactPhone || undefined}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter data={data} />
    </div>
  );
}
