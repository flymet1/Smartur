import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, CreditCard, Shield, Award, Globe, ChevronDown } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PublicWebsiteData } from "../../types";
import { useLanguage } from "../../i18n/LanguageContext";
import { languageNames, type Language } from "../../i18n";
import { getApiUrl } from "../../utils";

interface SmartutSettings {
  footer_logo_url: string;
  footer_link_url: string;
  footer_enabled: boolean;
}

interface PublicFooterProps {
  data?: PublicWebsiteData;
}

export function PublicFooter({ data }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const { t, language, setLanguage, getLocalizedPath } = useLanguage();
  
  // Smartur platform settings for footer logo
  const { data: smarturSettings } = useQuery<SmartutSettings>({
    queryKey: [getApiUrl("/api/website/smartur-settings")],
  });
  
  // Dil seçici görünmesi için en az 2 dil gerekli
  const configuredLanguages = data?.websiteLanguages as Language[] | undefined;
  const availableLanguages: Language[] = (configuredLanguages && configuredLanguages.length >= 2) 
    ? configuredLanguages 
    : ["tr", "en"];

  const footerStyle: React.CSSProperties = {
    ...(data?.websiteFooterBackgroundColor && { backgroundColor: data.websiteFooterBackgroundColor }),
    ...(data?.websiteFooterTextColor && { color: data.websiteFooterTextColor }),
  };

  const linkClass = data?.websiteFooterTextColor 
    ? "hover:opacity-80 transition-opacity" 
    : "text-muted-foreground hover:text-foreground transition-colors";

  const mutedClass = data?.websiteFooterTextColor
    ? "opacity-70"
    : "text-muted-foreground";

  return (
    <footer className="bg-card border-t mt-auto" style={footerStyle}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {data?.logoUrl ? (
                <img src={data.logoUrl} alt={data.name} className="h-12 w-auto" />
              ) : (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="font-bold text-lg block">
                      {data?.name || "Smartur Travel"}
                    </span>
                    <span className={`text-xs ${mutedClass}`}>Tours & Activities</span>
                  </div>
                </>
              )}
            </div>
            <p className={`text-sm leading-relaxed mb-4 ${mutedClass}`}>
              {data?.websiteFooterCompanyDescription || data?.websiteAboutText || t.footer.defaultAbout}
            </p>
            
            <div className="flex items-center gap-3 mt-4">
              {data?.websiteSocialLinks?.facebook && (
                <a
                  href={data.websiteSocialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full bg-muted/50 ${linkClass}`}
                  data-testid="link-footer-facebook"
                >
                  <FaFacebook className="h-4 w-4" />
                </a>
              )}
              {data?.websiteSocialLinks?.instagram && (
                <a
                  href={data.websiteSocialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full bg-muted/50 ${linkClass}`}
                  data-testid="link-footer-instagram"
                >
                  <FaInstagram className="h-4 w-4" />
                </a>
              )}
              {data?.websiteSocialLinks?.twitter && (
                <a
                  href={data.websiteSocialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full bg-muted/50 ${linkClass}`}
                  data-testid="link-footer-twitter"
                >
                  <FaTwitter className="h-4 w-4" />
                </a>
              )}
              {data?.websiteSocialLinks?.youtube && (
                <a
                  href={data.websiteSocialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full bg-muted/50 ${linkClass}`}
                  data-testid="link-footer-youtube"
                >
                  <FaYoutube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-base">{t.footer.quickLinks}</h3>
            <ul className="space-y-3">
              <li>
                <Link href={getLocalizedPath("/")} className={`text-sm ${linkClass} flex items-center gap-2`}>
                  {t.common.home}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/aktiviteler")} className={`text-sm ${linkClass} flex items-center gap-2`}>
                  {t.common.activities}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/iletisim")} className={`text-sm ${linkClass} flex items-center gap-2`}>
                  {t.common.contact}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/takip")} className={`text-sm ${linkClass} flex items-center gap-2`}>
                  {t.common.reservationTracking}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-base">{t.common.contact}</h3>
            <ul className="space-y-3">
              {(data?.websiteContactAddress || data?.address) && (
                <li className={`flex items-start gap-3 text-sm ${mutedClass}`}>
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{data.websiteContactAddress || data.address}</span>
                </li>
              )}
              {(data?.websiteContactPhone || data?.contactPhone) && (
                <li className={`flex items-center gap-3 text-sm ${mutedClass}`}>
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${data.websiteContactPhone || data.contactPhone}`} className={linkClass}>
                    {data.websiteContactPhone || data.contactPhone}
                  </a>
                </li>
              )}
              {(data?.websiteContactEmail || data?.contactEmail) && (
                <li className={`flex items-center gap-3 text-sm ${mutedClass}`}>
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${data.websiteContactEmail || data.contactEmail}`} className={linkClass}>
                    {data.websiteContactEmail || data.contactEmail}
                  </a>
                </li>
              )}
            </ul>
            
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-base">{t.footer.legalLinks}</h3>
            <ul className="space-y-3">
              <li>
                <Link href={getLocalizedPath("/blog")} className={`text-sm ${linkClass}`} data-testid="link-footer-blog">
                  {t.blog?.title || "Blog"}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/iptal-iade-politikasi")} className={`text-sm ${linkClass}`} data-testid="link-footer-cancellation">
                  {t.footer.cancellation}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/gizlilik-politikasi")} className={`text-sm ${linkClass}`} data-testid="link-footer-privacy">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath("/kullanim-kosullari")} className={`text-sm ${linkClass}`} data-testid="link-footer-terms">
                  {t.footer.terms}
                </Link>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className={`text-xs ${mutedClass}`}>{t.footer.securePayment}</span>
            </div>
          </div>
        </div>

        {data?.websiteFooterPaymentImageUrl && (
          <div className="border-t mt-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className={`h-5 w-5 ${mutedClass}`} />
                <span className={`text-sm font-medium ${mutedClass}`}>{t.footer.paymentMethods}</span>
              </div>
              <img
                src={data.websiteFooterPaymentImageUrl}
                alt="Payment Methods"
                className="h-8 w-auto object-contain"
                data-testid="img-payment-methods"
              />
            </div>
          </div>
        )}

        <div className="border-t mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className={`text-xs ${mutedClass}`}>
            {data?.websiteFooterCopyrightText || 
              `© ${currentYear} ${data?.name || "Smartur Travel"}. ${t.footer.allRightsReserved}`}
          </p>
          <div className="flex items-center gap-4">
            {availableLanguages.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="button-footer-language">
                    <Globe className="h-4 w-4" />
                    <span>{languageNames[language]}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={cn(language === lang && "bg-muted")}
                      data-testid={`menu-item-footer-lang-${lang}`}
                    >
                      {languageNames[lang]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className={`text-xs ${mutedClass}`}>{t.footer.licensed}</span>
            </div>
          </div>
        </div>

        {smarturSettings?.footer_enabled && (
          <div className="border-t mt-4 pt-4 flex flex-col items-center justify-center gap-1">
            <a
              href={smarturSettings.footer_link_url || "https://www.mysmartur.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              data-testid="link-smartur-footer"
            >
              <img
                src={smarturSettings.footer_logo_url || "/smartur-logo.png"}
                alt="Smartur"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
