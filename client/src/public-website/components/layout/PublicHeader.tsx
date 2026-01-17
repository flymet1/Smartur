import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe, MapPin, Phone, Mail, ChevronDown, Calendar } from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "../../i18n/LanguageContext";
import { languageNames, type Language } from "../../i18n";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

interface PublicHeaderProps {
  agencyName?: string;
  logo?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  socialLinks?: SocialLinks;
  availableLanguages?: Language[];
  headerBackgroundColor?: string | null;
  headerTextColor?: string | null;
}

export function PublicHeader({ 
  agencyName = "Smartur Travel", 
  logo, 
  phone,
  email,
  whatsapp,
  socialLinks,
  availableLanguages = ["tr", "en"],
  headerBackgroundColor,
  headerTextColor
}: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/", label: t.common.home },
    { href: "/aktiviteler", label: t.common.activities },
    { href: "/blog", label: t.blog?.title || "Blog" },
    { href: "/hakkimizda", label: t.common.about },
    { href: "/iletisim", label: t.common.contact },
  ];

  const hasSocialLinks = socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.twitter || socialLinks.youtube);
  const hasContactInfo = phone || email || whatsapp;

  const topBarStyle: React.CSSProperties = {
    ...(headerBackgroundColor && { backgroundColor: headerBackgroundColor }),
    ...(headerTextColor && { color: headerTextColor }),
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {(hasContactInfo || hasSocialLinks) && (
        <div 
          className="bg-primary text-primary-foreground text-sm py-2 hidden md:block"
          style={topBarStyle}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{phone}</span>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{email}</span>
                  </a>
                )}
                {whatsapp && (
                  <a 
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  >
                    <FaWhatsapp className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-4">
                {hasSocialLinks && (
                  <div className="flex items-center gap-3">
                    {socialLinks?.facebook && (
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <FaFacebookF className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {socialLinks?.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <FaInstagram className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {socialLinks?.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <FaTwitter className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {socialLinks?.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <FaYoutube className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
                {availableLanguages.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 hover:opacity-80 transition-opacity" data-testid="button-language-selector-top">
                        <Globe className="h-3.5 w-3.5" />
                        <span>{languageNames[language]}</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
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
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-300",
        isScrolled ? "shadow-md" : "border-b border-border/40"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 md:h-20 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              {logo ? (
                <img src={logo} alt={agencyName} className="h-10 md:h-12 w-auto" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg group-hover:shadow-primary/25 transition-shadow">
                    <MapPin className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                  </div>
                  <div className="hidden sm:block">
                    <span className="font-bold text-lg md:text-xl block leading-tight" data-testid="text-agency-name">
                      {agencyName}
                    </span>
                    <span className="text-xs text-muted-foreground">Tours & Activities</span>
                  </div>
                </div>
              )}
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className={cn(
                      "text-muted-foreground font-medium relative",
                      location === item.href && "text-primary"
                    )}
                    data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                    {location === item.href && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {phone && (
                <a href={`tel:${phone}`} className="hidden md:flex lg:hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>{phone}</span>
                </a>
              )}

              <Link href="/takip" className="hidden sm:block">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-track-reservation">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden md:inline">{t.common.reservationTracking}</span>
                  <span className="md:hidden">{t.common.track}</span>
                </Button>
              </Link>

              <Link href="/aktiviteler">
                <Button size="sm" className="gap-2 shadow-lg shadow-primary/25" data-testid="button-book-now-header">
                  {t.activities.bookNow}
                </Button>
              </Link>

              {availableLanguages.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-language-selector-mobile">
                      <Globe className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {availableLanguages.map((lang) => (
                      <DropdownMenuItem
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={cn(language === lang && "bg-muted")}
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
                className="lg:hidden"
                onClick={() => setIsOpen(!isOpen)}
                data-testid="button-mobile-menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {isOpen && (
            <nav className="lg:hidden py-4 border-t animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-muted-foreground h-12",
                        location === item.href && "text-primary bg-primary/5"
                      )}
                      data-testid={`link-mobile-nav-${item.href.replace("/", "") || "home"}`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                ))}
                <Link href="/takip" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground h-12"
                    data-testid="link-mobile-nav-track"
                  >
                    {t.common.reservationTracking}
                  </Button>
                </Link>
                {(phone || email) && (
                  <div className="pt-4 mt-2 border-t space-y-2">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {phone}
                      </a>
                    )}
                    {email && (
                      <a href={`mailto:${email}`} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
