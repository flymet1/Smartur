import { Switch, Route, Router, Redirect } from "wouter";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { PublicLayout } from "./components/layout/PublicLayout";
import PublicHome from "./pages/PublicHome";
import PublicActivities from "./pages/PublicActivities";
import PublicActivityDetail from "./pages/PublicActivityDetail";
import PublicReservation from "./pages/PublicReservation";
import PublicContact from "./pages/PublicContact";
import PublicTrackReservation from "./pages/PublicTrackReservation";
import PublicBlog from "./pages/PublicBlog";
import PublicBlogDetail from "./pages/PublicBlogDetail";
import PublicPackageTours from "./pages/PublicPackageTours";
import PublicPaymentSuccess from "./pages/PublicPaymentSuccess";
import PublicPaymentFailed from "./pages/PublicPaymentFailed";
import type { PublicWebsiteData } from "./types";
import { isPreviewMode, getApiUrl } from "./utils";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import { useEffect } from "react";

const publicQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetch(url, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        return response.json();
      },
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicNotFound() {
  const { t, language } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">{t.common.notFound}</p>
        <a href={`/${language}`} className="text-primary hover:underline">
          {t.common.backToHome}
        </a>
      </div>
    </div>
  );
}

function HreflangTags() {
  const { language, getAlternateLanguagePath } = useLanguage();
  
  useEffect(() => {
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      // Remove existing hreflang tags
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
      
      // Add hreflang tags for SEO
      const languages = ["tr", "en"] as const;
      const baseUrl = window.location.origin;
      
      languages.forEach(lang => {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = lang;
        link.href = baseUrl + getAlternateLanguagePath(lang);
        document.head.appendChild(link);
      });
      
      // Add x-default (points to Turkish as default)
      const defaultLink = document.createElement("link");
      defaultLink.rel = "alternate";
      defaultLink.hreflang = "x-default";
      defaultLink.href = baseUrl + getAlternateLanguagePath("tr");
      document.head.appendChild(defaultLink);
    }
  }, [language, getAlternateLanguagePath]);
  
  return null;
}

// Route mappings for legacy redirects
const legacyRouteRedirects: Record<string, Record<string, string>> = {
  "/aktiviteler": { tr: "/tr/aktiviteler", en: "/en/activities" },
  "/aktivite": { tr: "/tr/aktivite", en: "/en/activity" },
  "/iletisim": { tr: "/tr/iletisim", en: "/en/contact" },
  "/takip": { tr: "/tr/takip", en: "/en/track" },
  "/blog": { tr: "/tr/blog", en: "/en/blog" },
};

// Component to preserve query/hash when redirecting legacy URLs
function LegacyRedirect({ to }: { to: string }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const query = window.location.search;
      const hash = window.location.hash;
      window.location.replace(to + query + hash);
    }
  }, [to]);
  return null;
}

function PublicWebsiteContent() {
  const { t, language } = useLanguage();
  
  const { data: websiteData, isLoading, error } = useQuery<PublicWebsiteData>({
    queryKey: [getApiUrl(`/api/website/data?lang=${language}`)],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t.common.error}</h1>
          <p className="text-muted-foreground">{t.common.notFound}</p>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout data={websiteData}>
      <HreflangTags />
      <Switch>
        {/* Turkish routes */}
        <Route path="/tr">
          <PublicHome websiteData={websiteData} />
        </Route>
        <Route path="/tr/aktiviteler" component={PublicActivities} />
        <Route path="/tr/aktivite/:id" component={PublicActivityDetail} />
        <Route path="/tr/rezervasyon/:id" component={PublicReservation} />
        <Route path="/tr/iletisim">
          <PublicContact websiteData={websiteData} />
        </Route>
        <Route path="/tr/takip" component={PublicTrackReservation} />
        <Route path="/tr/blog">
          <PublicBlog websiteData={websiteData} />
        </Route>
        <Route path="/tr/blog/:slug">
          <PublicBlogDetail websiteData={websiteData} />
        </Route>
        <Route path="/tr/paket-turlar" component={PublicPackageTours} />
        <Route path="/tr/odeme-basarili" component={PublicPaymentSuccess} />
        <Route path="/tr/odeme-basarisiz" component={PublicPaymentFailed} />

        {/* English routes */}
        <Route path="/en">
          <PublicHome websiteData={websiteData} />
        </Route>
        <Route path="/en/activities" component={PublicActivities} />
        <Route path="/en/activity/:id" component={PublicActivityDetail} />
        <Route path="/en/reservation/:id" component={PublicReservation} />
        <Route path="/en/contact">
          <PublicContact websiteData={websiteData} />
        </Route>
        <Route path="/en/track" component={PublicTrackReservation} />
        <Route path="/en/blog">
          <PublicBlog websiteData={websiteData} />
        </Route>
        <Route path="/en/blog/:slug">
          <PublicBlogDetail websiteData={websiteData} />
        </Route>
        <Route path="/en/package-tours" component={PublicPackageTours} />
        <Route path="/en/payment-success" component={PublicPaymentSuccess} />
        <Route path="/en/payment-failed" component={PublicPaymentFailed} />

        {/* Redirect root to default language */}
        <Route path="/">
          <Redirect to={`/${language}`} />
        </Route>

        {/* Legacy routes redirect to new language-prefixed routes with query/hash preserved */}
        <Route path="/aktiviteler">
          <LegacyRedirect to={legacyRouteRedirects["/aktiviteler"][language]} />
        </Route>
        <Route path="/aktivite/:id">
          {(params) => <LegacyRedirect to={`${legacyRouteRedirects["/aktivite"][language]}/${params.id}`} />}
        </Route>
        <Route path="/iletisim">
          <LegacyRedirect to={legacyRouteRedirects["/iletisim"][language]} />
        </Route>
        <Route path="/takip">
          <LegacyRedirect to={legacyRouteRedirects["/takip"][language]} />
        </Route>
        <Route path="/blog">
          <LegacyRedirect to={legacyRouteRedirects["/blog"][language]} />
        </Route>

        <Route component={PublicNotFound} />
      </Switch>
    </PublicLayout>
  );
}

function PublicWebsiteRouter() {
  const basePath = isPreviewMode() ? '/website-preview' : '';
  
  return (
    <Router base={basePath}>
      <LanguageProvider defaultLanguage="tr" availableLanguages={["tr", "en"]}>
        <PublicWebsiteContent />
      </LanguageProvider>
    </Router>
  );
}

export function PublicWebsiteApp() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={publicQueryClient}>
        <PublicWebsiteRouter />
      </QueryClientProvider>
    </HelmetProvider>
  );
}
