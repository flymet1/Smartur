import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { StickyAnnouncements } from "@/components/layout/StickyAnnouncements";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { AppFooter } from "@/components/layout/AppFooter";
import { PopupThemeProvider } from "@/components/PopupThemeProvider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import PackageTours from "@/pages/PackageTours";
import Holidays from "@/pages/Holidays";
import Reservations from "@/pages/Reservations";
import CalendarPage from "@/pages/Calendar";
import BotTest from "@/pages/BotTest";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import Finance from "@/pages/Finance";
import BotRules from "@/pages/BotRules";
import UserGuide from "@/pages/UserGuide";
import Support from "@/pages/Support";
import CustomerTracking from "@/pages/CustomerTracking";
import CustomerRequests from "@/pages/CustomerRequests";
import Agencies from "@/pages/Agencies";
import SalesPresentation from "@/pages/SalesPresentation";
import Subscription from "@/pages/Subscription";
import SuperAdmin from "@/pages/SuperAdmin";
import Developer from "@/pages/Developer";
import Login from "@/pages/Login";
import Musaitlik from "@/pages/Musaitlik";
import ViewerStats from "@/pages/ViewerStats";
import PartnerProfile from "@/pages/PartnerProfile";
import PartnerAvailability from "@/pages/PartnerAvailability";
import WebSite from "@/pages/WebSite";
import WebsitePreview from "@/pages/WebsitePreview";
import Blog from "@/pages/Blog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Reservations} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/activities" component={Activities} />
      <Route path="/package-tours" component={PackageTours} />
      <Route path="/holidays" component={Holidays} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/finance" component={Finance} />
      <Route path="/agencies" component={Agencies} />
      <Route path="/bot-test" component={BotTest} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route path="/bot-rules" component={BotRules} />
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/support" component={Support} />
      <Route path="/takip/:token" component={CustomerTracking} />
      <Route path="/customer-requests" component={CustomerRequests} />
      <Route path="/sales-presentation" component={SalesPresentation} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route path="/developer" component={Developer} />
      <Route path="/login" component={Login} />
      <Route path="/musaitlik" component={Musaitlik} />
      <Route path="/viewer-stats" component={ViewerStats} />
      <Route path="/partner-profile" component={PartnerProfile} />
      <Route path="/partner-availability" component={PartnerAvailability} />
      <Route path="/website" component={WebSite} />
      <Route path="/website-preview" component={WebsitePreview} />
      <Route path="/website-preview/:rest*" component={WebsitePreview} />
      <Route path="/blog" component={Blog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+S for Super Admin panel
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        window.open('/super-admin', '_blank');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

function App() {
  const isWebsitePreview = typeof window !== 'undefined' && 
    window.location.pathname.startsWith('/website-preview');
  
  if (isWebsitePreview) {
    return <WebsitePreview />;
  }
  
  const isPublicRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/super-admin' ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/sales-presentation' ||
    window.location.pathname === '/subscription' ||
    window.location.pathname.startsWith('/takip/')
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PopupThemeProvider>
        <TooltipProvider>
          {isPublicRoute ? (
            <>
              <ScrollToTop />
              <KeyboardShortcuts />
              <Toaster />
              <Router />
            </>
          ) : (
            <AuthGuard>
              <ScrollToTop />
              <KeyboardShortcuts />
              <StickyAnnouncements />
              <GlobalNotifications />
              <Toaster />
              <Router />
              <AppFooter />
            </AuthGuard>
          )}
        </TooltipProvider>
      </PopupThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
