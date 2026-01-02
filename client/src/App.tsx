import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/activities" component={Activities} />
      <Route path="/package-tours" component={PackageTours} />
      <Route path="/holidays" component={Holidays} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/finance" component={Finance} />
      <Route path="/bot-test" component={BotTest} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route path="/bot-rules" component={BotRules} />
      <Route path="/user-guide" component={UserGuide} />
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
