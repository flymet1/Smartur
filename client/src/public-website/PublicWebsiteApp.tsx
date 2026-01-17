import { Switch, Route, Router } from "wouter";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicLayout } from "./components/layout/PublicLayout";
import PublicHome from "./pages/PublicHome";
import PublicActivities from "./pages/PublicActivities";
import PublicActivityDetail from "./pages/PublicActivityDetail";
import PublicReservation from "./pages/PublicReservation";
import PublicContact from "./pages/PublicContact";
import PublicTrackReservation from "./pages/PublicTrackReservation";
import PublicBlog from "./pages/PublicBlog";
import PublicBlogDetail from "./pages/PublicBlogDetail";
import type { PublicWebsiteData } from "./types";
import { isPreviewMode, getApiUrl } from "./utils";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";

// Create a separate query client for public website
// Note: Preview mode is handled by getApiUrl() in utils.ts which adds ?preview=true when needed
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
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">{t.common.notFound}</p>
        <a href="/" className="text-primary hover:underline">
          {t.common.backToHome}
        </a>
      </div>
    </div>
  );
}

function PublicWebsiteContent() {
  const { t } = useLanguage();
  
  const { data: websiteData, isLoading, error } = useQuery<PublicWebsiteData>({
    queryKey: [getApiUrl("/api/website/data")],
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
      <Switch>
        <Route path="/">
          <PublicHome websiteData={websiteData} />
        </Route>
        <Route path="/aktiviteler" component={PublicActivities} />
        <Route path="/aktivite/:id" component={PublicActivityDetail} />
        <Route path="/rezervasyon/:id" component={PublicReservation} />
        <Route path="/iletisim">
          <PublicContact websiteData={websiteData} />
        </Route>
        <Route path="/takip" component={PublicTrackReservation} />
        <Route path="/blog">
          <PublicBlog websiteData={websiteData} />
        </Route>
        <Route path="/blog/:slug">
          <PublicBlogDetail websiteData={websiteData} />
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
      <PublicWebsiteContent />
    </Router>
  );
}

export function PublicWebsiteApp() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <LanguageProvider defaultLanguage="tr" availableLanguages={["tr", "en"]}>
        <PublicWebsiteRouter />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
