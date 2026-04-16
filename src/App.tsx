import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Homepage from "./pages/Homepage";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import ChatWithDatabase from "./pages/ChatWithDatabase";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import MyDashboard from "./pages/MyDashboard";
import Help from "./pages/Help";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth" element={<Auth />} />

            {/* Primary app routes */}
            <Route path="/chat" element={<ChatWithDatabase />} />
            <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
            <Route path="/my-dashboard" element={<MyDashboard />} />

            {/* Redirect old dataset/dashboard routes */}
            <Route path="/my-datasets" element={<Navigate to="/chat" replace />} />
            <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
            <Route path="/dashboard/:type/:id" element={<Navigate to="/chat" replace />} />

            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
