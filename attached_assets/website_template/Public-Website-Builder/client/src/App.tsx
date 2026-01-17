import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Activities from "@/pages/Activities";
import ActivityDetail from "@/pages/ActivityDetail";
import Reservation from "@/pages/Reservation";
import TrackReservation from "@/pages/TrackReservation";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/not-found";
import type { AgencyInfo } from "@shared/schema";

function Router() {
  const { data: agency } = useQuery<AgencyInfo>({
    queryKey: ["/api/agency"],
  });

  return (
    <Layout agency={agency}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/activities" component={Activities} />
        <Route path="/activities/:slug" component={ActivityDetail} />
        <Route path="/activities/:slug/book" component={Reservation} />
        <Route path="/track" component={TrackReservation} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
