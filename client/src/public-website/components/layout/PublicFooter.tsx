import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaWhatsapp } from "react-icons/fa";
import type { PublicWebsiteData } from "../../types";
import { useLanguage } from "../../i18n/LanguageContext";

interface PublicFooterProps {
  data?: PublicWebsiteData;
}

export function PublicFooter({ data }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {data?.logoUrl ? (
                <img src={data.logoUrl} alt={data.name} className="h-10 w-auto" />
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-lg">
                    {data?.name || "Smartur Travel"}
                  </span>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {data?.websiteAboutText || t.footer.defaultAbout}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/aktiviteler" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.common.activities}
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.common.contact}
                </Link>
              </li>
              <li>
                <Link href="/takip" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.common.reservationTracking}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.common.contact}</h3>
            <ul className="space-y-3">
              {data?.websiteContactAddress && (
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{data.websiteContactAddress}</span>
                </li>
              )}
              {data?.websiteContactPhone && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${data.websiteContactPhone}`} className="hover:text-foreground transition-colors">
                    {data.websiteContactPhone}
                  </a>
                </li>
              )}
              {data?.websiteContactEmail && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${data.websiteContactEmail}`} className="hover:text-foreground transition-colors">
                    {data.websiteContactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.socialMedia}</h3>
            <div className="flex items-center gap-3">
              {data?.websiteSocialLinks?.facebook && (
                <a
                  href={data.websiteSocialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FaFacebook className="h-5 w-5" />
                </a>
              )}
              {data?.websiteSocialLinks?.instagram && (
                <a
                  href={data.websiteSocialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FaInstagram className="h-5 w-5" />
                </a>
              )}
              {data?.websiteSocialLinks?.twitter && (
                <a
                  href={data.websiteSocialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FaTwitter className="h-5 w-5" />
                </a>
              )}
              {data?.websiteSocialLinks?.youtube && (
                <a
                  href={data.websiteSocialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FaYoutube className="h-5 w-5" />
                </a>
              )}
            </div>
            
            {data?.websiteWhatsappNumber && (
              <a
                href={`https://wa.me/${data.websiteWhatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <FaWhatsapp className="h-5 w-5" />
                {t.footer.whatsapp}
              </a>
            )}
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {data?.name || "Smartur Travel"}. {t.footer.allRightsReserved}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/gizlilik" className="hover:text-foreground transition-colors">
              {t.footer.privacy}
            </Link>
            <Link href="/sartlar" className="hover:text-foreground transition-colors">
              {t.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
