import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '0') {
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <KeyboardShortcuts />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
