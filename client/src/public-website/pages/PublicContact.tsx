import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaWhatsapp } from "react-icons/fa";
import { SEO } from "../components/shared/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import type { PublicWebsiteData } from "../types";

interface PublicContactProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicContact({ websiteData }: PublicContactProps) {
  const { language, t } = useLanguage();
  const pageTitle = websiteData?.websiteContactPageTitle || t.contact?.title || "İletişim";
  
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        websiteData={websiteData}
        title={pageTitle}
        description={websiteData?.websiteContactPageContent?.substring(0, 160) || ""}
        language={language}
      />
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">
            {websiteData?.websiteContactPageTitle || "İletişim"}
          </h1>
          <p className="text-muted-foreground">Bizimle iletişime geçin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bize Ulaşın</h2>
            
            {websiteData?.websiteContactPageContent && (
              <p className="text-muted-foreground mb-8 whitespace-pre-line">
                {websiteData.websiteContactPageContent}
              </p>
            )}

            <div className="space-y-6">
              {websiteData?.websiteContactPhone && (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a 
                        href={`tel:${websiteData.websiteContactPhone}`} 
                        className="font-medium text-lg hover:text-primary transition-colors"
                      >
                        {websiteData.websiteContactPhone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {websiteData?.websiteContactEmail && (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <a 
                        href={`mailto:${websiteData.websiteContactEmail}`} 
                        className="font-medium text-lg hover:text-primary transition-colors"
                      >
                        {websiteData.websiteContactEmail}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {websiteData?.websiteContactAddress && (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium">{websiteData.websiteContactAddress}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {websiteData?.websiteWhatsappNumber && (
                <Card className="bg-green-50 border-0 shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <FaWhatsapp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700">WhatsApp</p>
                      <a 
                        href={`https://wa.me/${websiteData.websiteWhatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-lg text-green-700 hover:text-green-800 transition-colors"
                      >
                        {websiteData.websiteWhatsappNumber}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Çalışma Saatleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pazartesi - Cumartesi</span>
                    <span className="font-medium">09:00 - 20:00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pazar</span>
                    <span className="font-medium">10:00 - 18:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>{websiteData?.websiteAboutPageTitle || "Hakkımızda"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {websiteData?.websiteAboutPageContent || websiteData?.websiteAboutText || 
                      "Bölgenin en güvenilir tur ve aktivite sağlayıcısı olarak, unutulmaz deneyimler sunuyoruz."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
