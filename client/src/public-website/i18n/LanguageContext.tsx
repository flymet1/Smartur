import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, Translations, getTranslation } from "./index";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
  availableLanguages?: Language[];
}

export function LanguageProvider({ 
  children, 
  defaultLanguage = "tr",
  availableLanguages = ["tr", "en"]
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("website-language");
      if (saved && availableLanguages.includes(saved as Language)) {
        return saved as Language;
      }
      const browserLang = navigator.language.split("-")[0];
      if (availableLanguages.includes(browserLang as Language)) {
        return browserLang as Language;
      }
    }
    return defaultLanguage;
  });

  const setLanguage = (lang: Language) => {
    if (availableLanguages.includes(lang)) {
      setLanguageState(lang);
      if (typeof window !== "undefined") {
        localStorage.setItem("website-language", lang);
      }
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
