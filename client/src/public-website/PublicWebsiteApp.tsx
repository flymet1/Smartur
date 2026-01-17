import { Switch, Route, Router } from "wouter";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicLayout } from "./components/layout/PublicLayout";
import PublicHome from "./pages/PublicHome";
import PublicActivities from "./pages/PublicActivities";
import PublicActivityDetail from "./pages/PublicActivityDetail";
import PublicReservation from "./pages/PublicReservation";
import PublicContact from "./pages/PublicContact";
import PublicTrackReservation from "./pages/PublicTrackReservation";
import type { PublicWebsiteData } from "./types";
import { isPreviewMode, getApiUrl } from "./utils";

const basePath = isPreviewMode ? '/website-preview' : '';

// Create a separate query client for public website with preview support
const publicQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const separator = url.includes('?') ? '&' : '?';
        const response = await fetch(`${url}${separator}preview=true`, {
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
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">Sayfa bulunamadı</p>
        <a href="/" className="text-primary hover:underline">
          Ana Sayfaya Dön
        </a>
      </div>
    </div>
  );
}

function PublicWebsiteContent() {
  const { data: websiteData, isLoading, error } = useQuery<PublicWebsiteData>({
    queryKey: [getApiUrl("/api/website/data")],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Web Sitesi Bulunamadı</h1>
          <p className="text-muted-foreground">Bu domain için yapılandırılmış bir web sitesi yok.</p>
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
        <Route component={PublicNotFound} />
      </Switch>
    </PublicLayout>
  );
}

export function PublicWebsiteApp() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <Router base={basePath}>
        <PublicWebsiteContent />
      </Router>
    </QueryClientProvider>
  );
}
