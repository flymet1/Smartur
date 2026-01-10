import { useEffect, createContext, useContext, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface PopupAppearanceSettings {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  blurIntensity: 'none' | 'low' | 'medium' | 'high' | 'ultra';
}

interface PopupThemeContextValue {
  settings: PopupAppearanceSettings;
  isLoading: boolean;
}

const defaultSettings: PopupAppearanceSettings = {
  backgroundColor: "#ffffff",
  backgroundOpacity: 70,
  borderColor: "#ffffff",
  borderOpacity: 30,
  blurIntensity: 'high',
};

const blurMap: Record<string, string> = {
  'none': '0',
  'low': '8px',
  'medium': '12px',
  'high': '24px',
  'ultra': '40px',
};

const PopupThemeContext = createContext<PopupThemeContextValue>({
  settings: defaultSettings,
  isLoading: true,
});

export function usePopupTheme() {
  return useContext(PopupThemeContext);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function applyPopupCssVariables(settings: PopupAppearanceSettings) {
  const root = document.documentElement;
  const bgRgb = hexToRgb(settings.backgroundColor);
  const borderRgb = hexToRgb(settings.borderColor);
  const blur = blurMap[settings.blurIntensity] || '24px';
  
  root.style.setProperty('--popup-bg-r', bgRgb.r.toString());
  root.style.setProperty('--popup-bg-g', bgRgb.g.toString());
  root.style.setProperty('--popup-bg-b', bgRgb.b.toString());
  root.style.setProperty('--popup-bg-opacity', (settings.backgroundOpacity / 100).toString());
  root.style.setProperty('--popup-border-r', borderRgb.r.toString());
  root.style.setProperty('--popup-border-g', borderRgb.g.toString());
  root.style.setProperty('--popup-border-b', borderRgb.b.toString());
  root.style.setProperty('--popup-border-opacity', (settings.borderOpacity / 100).toString());
  root.style.setProperty('--popup-blur', blur);
}

export function PopupThemeProvider({ children }: { children: React.ReactNode }) {
  const lastAppliedRef = useRef<string>("");
  const hasInitialized = useRef(false);
  
  const { data: popupSettingsResponse, isLoading } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'popupAppearance'],
    queryFn: async () => {
      const res = await fetch('/api/settings/popupAppearance');
      return res.json();
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
  
  const settings: PopupAppearanceSettings = popupSettingsResponse?.value 
    ? (() => {
        try {
          return JSON.parse(popupSettingsResponse.value);
        } catch {
          return defaultSettings;
        }
      })()
    : defaultSettings;
  
  useEffect(() => {
    if (!hasInitialized.current) {
      applyPopupCssVariables(defaultSettings);
      lastAppliedRef.current = JSON.stringify(defaultSettings);
      hasInitialized.current = true;
    }
  }, []);
  
  useEffect(() => {
    if (hasInitialized.current) {
      const settingsJson = JSON.stringify(settings);
      if (settingsJson !== lastAppliedRef.current) {
        applyPopupCssVariables(settings);
        lastAppliedRef.current = settingsJson;
      }
    }
  }, [settings]);
  
  return (
    <PopupThemeContext.Provider value={{ settings, isLoading }}>
      {children}
    </PopupThemeContext.Provider>
  );
}
