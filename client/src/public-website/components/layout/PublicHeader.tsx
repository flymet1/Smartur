import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "../../i18n/LanguageContext";
import { languageNames, type Language } from "../../i18n";

interface PublicHeaderProps {
  agencyName?: string;
  logo?: string;
  phone?: string;
  availableLanguages?: Language[];
}

export function PublicHeader({ 
  agencyName = "Smartur Travel", 
  logo, 
  phone,
  availableLanguages = ["tr", "en"]
}: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { href: "/", label: t.common.home },
    { href: "/aktiviteler", label: t.common.activities },
    { href: "/iletisim", label: t.common.contact },
    { href: "/takip", label: t.common.reservationTracking },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={agencyName} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                  <MapPin className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg hidden sm:inline-block" data-testid="text-agency-name">
                  {agencyName}
                </span>
              </div>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "text-muted-foreground",
                    location === item.href && "text-foreground bg-muted"
                  )}
                  data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {phone && (
              <a href={`tel:${phone}`} className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            )}

            {availableLanguages.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="button-language-selector">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{languageNames[language]}</span>
                    <span className="sm:hidden">{language.toUpperCase()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={cn(language === lang && "bg-muted")}
                      data-testid={`menu-item-lang-${lang}`}
                    >
                      {languageNames[lang]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="button-mobile-menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-muted-foreground",
                      location === item.href && "text-foreground bg-muted"
                    )}
                    data-testid={`link-mobile-nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
