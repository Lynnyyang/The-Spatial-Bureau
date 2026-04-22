import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Home from "./pages/Home";
import Cases from "./pages/Cases";
import CasePage from "./pages/CasePage";
import DependencyLab from "./pages/labs/DependencyLab";
import NeighborsLab from "./pages/labs/NeighborsLab";
import WeightsLab from "./pages/labs/WeightsLab";
import AutocorrelationLab from "./pages/labs/AutocorrelationLab";
import Training from "./pages/Training";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import Certificate from "./pages/Certificate";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/case/:id" element={<CasePage />} />
            <Route path="/lab/dependency" element={<DependencyLab />} />
            <Route path="/lab/neighbors" element={<NeighborsLab />} />
            <Route path="/lab/weights" element={<WeightsLab />} />
            <Route path="/lab/autocorrelation" element={<AutocorrelationLab />} />
            <Route path="/training" element={<Training />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
