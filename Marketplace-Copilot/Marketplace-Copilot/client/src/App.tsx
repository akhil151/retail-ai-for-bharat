import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import BusinessIntelligenceDashboard from "@/pages/BusinessIntelligenceDashboard";
import PriceSuggestionDashboard from "@/pages/PriceSuggestionDashboard";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import StockAnalysisDashboard from "@/pages/StockAnalysisDashboard";
import DebugInventory from "@/pages/DebugInventory";
import { Layout } from "@/components/Layout";

// Wrapper for protected routes
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Login Page */}
      <Route path="/">
        {user ? <Redirect to="/landing" /> : <Login />}
      </Route>

      {/* Landing Page */}
      <Route path="/landing">
        {user ? <Landing /> : <Redirect to="/" />}
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={Products} />
      </Route>
      <Route path="/demand-prediction">
        <ProtectedRoute component={BusinessIntelligenceDashboard} />
      </Route>

      {/* Price Suggestion Dashboard - Standalone (not wrapped in Layout) */}
      <Route path="/stock-analysis">
        {user ? <StockAnalysisDashboard /> : <Redirect to="/" />}
      </Route>
      <Route path="/price-suggestion">
        {user ? <PriceSuggestionDashboard /> : <Redirect to="/" />}
      </Route>
      <Route path="/debug-inventory">
        {user ? <DebugInventory /> : <Redirect to="/" />}
      </Route>

      {/* Placeholder for settings */}
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

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
