import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SuperAdmin from "@/pages/SuperAdmin";
import Developer from "@/pages/Developer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SuperAdmin} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route path="/developer" component={Developer} />
      <Route>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Smartur Super Admin</h1>
            <p className="text-muted-foreground">Yonetim paneline hosgeldiniz.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
