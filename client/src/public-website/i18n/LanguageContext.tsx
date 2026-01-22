import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Language, Translations, getTranslation } from "./index";
import { useLocation } from "wouter";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  getLocalizedPath: (path: string) => string;
  getAlternateLanguagePath: (lang: Language) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
  availableLanguages?: Language[];
}

// Route mappings for SEO-friendly URLs
const routeMappings: Record<string, Record<Language, string>> = {
  "/": { tr: "/", en: "/" },
  "/aktiviteler": { tr: "/aktiviteler", en: "/activities" },
  "/aktivite": { tr: "/aktivite", en: "/activity" },
  "/rezervasyon": { tr: "/rezervasyon", en: "/reservation" },
  "/iletisim": { tr: "/iletisim", en: "/contact" },
  "/takip": { tr: "/takip", en: "/track" },
  "/blog": { tr: "/blog", en: "/blog" },
};

// Reverse mapping to find base route from localized route
function findBaseRoute(localizedPath: string, lang: Language): string {
  for (const [base, mappings] of Object.entries(routeMappings)) {
    if (mappings[lang] === localizedPath || localizedPath.startsWith(mappings[lang] + "/")) {
      return base;
    }
  }
  return localizedPath;
}

// Get language from URL path
function getLanguageFromPath(pathname: string): Language | null {
  const langMatch = pathname.match(/^\/(tr|en)(\/|$)/);
  if (langMatch) {
    return langMatch[1] as Language;
  }
  return null;
}

// Remove language prefix from path
function removeLanguagePrefix(pathname: string): string {
  return pathname.replace(/^\/(tr|en)(\/|$)/, "/").replace(/\/$/, "") || "/";
}

export function LanguageProvider({ 
  children, 
  defaultLanguage = "tr",
  availableLanguages = ["tr", "en"]
}: LanguageProviderProps) {
  const [location, setLocation] = useLocation();
  
  // Determine initial language from URL or localStorage
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      // First check URL for language
      const urlLang = getLanguageFromPath(window.location.pathname);
      if (urlLang && availableLanguages.includes(urlLang)) {
        return urlLang;
      }
      
      // Then check localStorage
      const saved = localStorage.getItem("website-language");
      if (saved && availableLanguages.includes(saved as Language)) {
        return saved as Language;
      }
      
      // Finally check browser language
      const browserLang = navigator.language.split("-")[0];
      if (availableLanguages.includes(browserLang as Language)) {
        return browserLang as Language;
      }
    }
    return defaultLanguage;
  });

  // Get localized path for current language
  const getLocalizedPath = useCallback((basePath: string): string => {
    // Separate query string and hash from path
    const [pathWithoutQuery, ...queryParts] = basePath.split("?");
    const queryString = queryParts.length > 0 ? "?" + queryParts.join("?") : "";
    const [pathOnly, ...hashParts] = pathWithoutQuery.split("#");
    const hashString = hashParts.length > 0 ? "#" + hashParts.join("#") : "";
    
    // Handle paths with IDs like /aktivite/123
    const pathParts = pathOnly.split("/").filter(Boolean);
    if (pathParts.length === 0) {
      return `/${language}${queryString}${hashString}`;
    }
    
    const baseRoute = "/" + pathParts[0];
    const mapping = routeMappings[baseRoute];
    
    if (mapping) {
      const localizedBase = mapping[language];
      const rest = pathParts.slice(1).join("/");
      return `/${language}${localizedBase}${rest ? "/" + rest : ""}${queryString}${hashString}`;
    }
    
    return `/${language}${pathOnly}${queryString}${hashString}`;
  }, [language]);

  // Get path for alternate language (for hreflang tags)
  const getAlternateLanguagePath = useCallback((targetLang: Language): string => {
    const currentPath = removeLanguagePrefix(location);
    
    // Separate query string and hash from path
    const [pathWithoutQuery, ...queryParts] = currentPath.split("?");
    const queryString = queryParts.length > 0 ? "?" + queryParts.join("?") : "";
    const [pathOnly, ...hashParts] = pathWithoutQuery.split("#");
    const hashString = hashParts.length > 0 ? "#" + hashParts.join("#") : "";
    
    const pathParts = pathOnly.split("/").filter(Boolean);
    
    if (pathParts.length === 0) {
      return `/${targetLang}${queryString}${hashString}`;
    }
    
    // Find the base route from current localized path
    const baseRoute = "/" + pathParts[0];
    
    // Search for matching route in current language
    for (const [base, mappings] of Object.entries(routeMappings)) {
      if (mappings[language] === baseRoute) {
        const localizedBase = mappings[targetLang];
        const rest = pathParts.slice(1).join("/");
        return `/${targetLang}${localizedBase}${rest ? "/" + rest : ""}${queryString}${hashString}`;
      }
    }
    
    return `/${targetLang}${pathOnly}${queryString}${hashString}`;
  }, [language, location]);

  // Set language and navigate to new URL
  const setLanguage = useCallback((lang: Language) => {
    if (availableLanguages.includes(lang) && lang !== language) {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("website-language", lang);
      }
      
      // Navigate to the new language URL
      const newPath = getAlternateLanguagePath(lang);
      setLanguageState(lang);
      setLocation(newPath);
    }
  }, [availableLanguages, language, getAlternateLanguagePath, setLocation]);

  // Sync language with URL on initial load and URL changes
  useEffect(() => {
    const urlLang = getLanguageFromPath(location);
    if (urlLang && urlLang !== language && availableLanguages.includes(urlLang)) {
      setLanguageState(urlLang);
      localStorage.setItem("website-language", urlLang);
    }
  }, [location, availableLanguages]);

  // Redirect to language-prefixed URL if not present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const urlLang = getLanguageFromPath(pathname);
      
      // Don't redirect if we're in preview mode or already have language prefix
      if (!urlLang && !pathname.startsWith("/website-preview")) {
        const currentPath = pathname === "/" ? "" : pathname;
        const newPath = `/${language}${currentPath}`;
        window.history.replaceState(null, "", newPath);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedPath, getAlternateLanguagePath }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
