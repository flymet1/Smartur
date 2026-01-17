import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import type { AgencyInfo } from "@shared/schema";

interface FooterProps {
  agency?: AgencyInfo;
}

export function Footer({ agency }: FooterProps) {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">
                {agency?.name || "Smartur Travel"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {agency?.description ||
                "Discover unforgettable experiences with our curated tours and activities."}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("nav.activities")}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/activities"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-activities"
                >
                  {t("activities.all")}
                </Link>
              </li>
              <li>
                <Link
                  href="/activities?featured=true"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-featured"
                >
                  {t("activities.featured")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("contact.title")}</h3>
            <ul className="space-y-3">
              {agency?.address && (
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{agency.address}</span>
                </li>
              )}
              {agency?.phone && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${agency.phone}`} className="hover:text-foreground transition-colors">
                    {agency.phone}
                  </a>
                </li>
              )}
              {agency?.email && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${agency.email}`} className="hover:text-foreground transition-colors">
                    {agency.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("about.title")}</h3>
            <ul className="space-y-2 mb-4">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-contact"
                >
                  {t("contact.title")}
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-track"
                >
                  {t("nav.trackReservation")}
                </Link>
              </li>
            </ul>

            {agency?.socialLinks && (
              <div className="flex items-center gap-3">
                {agency.socialLinks.facebook && (
                  <a
                    href={agency.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-social-facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {agency.socialLinks.instagram && (
                  <a
                    href={agency.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-social-instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {agency.socialLinks.twitter && (
                  <a
                    href={agency.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-social-twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {agency.socialLinks.youtube && (
                  <a
                    href={agency.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-social-youtube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {currentYear} {agency?.name || "Smartur Travel"}. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
