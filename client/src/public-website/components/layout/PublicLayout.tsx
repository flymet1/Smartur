import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import type { PublicWebsiteData } from "../../types";
import type { Language } from "../../i18n";

interface PublicLayoutProps {
  children: React.ReactNode;
  data?: PublicWebsiteData;
}

export function PublicLayout({ children, data }: PublicLayoutProps) {
  // Dil seçici görünmesi için en az 2 dil gerekli
  const configuredLanguages = data?.websiteLanguages as Language[] | undefined;
  const availableLanguages = (configuredLanguages && configuredLanguages.length >= 2) 
    ? configuredLanguages 
    : ["tr", "en"] as Language[];
  
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader 
        agencyName={data?.websiteDisplayName || data?.name} 
        logo={data?.logoUrl || undefined} 
        phone={data?.websiteContactPhone || data?.contactPhone || undefined}
        email={data?.websiteContactEmail || data?.contactEmail || undefined}
        whatsapp={data?.websiteWhatsappNumber || undefined}
        socialLinks={data?.websiteSocialLinks}
        availableLanguages={availableLanguages}
        headerBackgroundColor={data?.websiteHeaderBackgroundColor}
        headerTextColor={data?.websiteHeaderTextColor}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter data={data} />
    </div>
  );
}
