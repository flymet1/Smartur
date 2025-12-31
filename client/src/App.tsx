import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import Reservations from "@/pages/Reservations";
import CalendarPage from "@/pages/Calendar";
import BotTest from "@/pages/BotTest";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/activities" component={Activities} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/bot-test" component={BotTest} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
