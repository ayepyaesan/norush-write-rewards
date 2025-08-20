import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Workspace from "./pages/Workspace";
import TaskCreation from "./pages/TaskCreation";
import Payment from "./pages/Payment";
import TaskWorkspace from "./pages/TaskWorkspace";
import RefundSummary from "./pages/RefundSummary";
import CombinedDashboard from "./pages/CombinedDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RichTextEditorPage from "./pages/RichTextEditorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/task-creation" element={<TaskCreation />} />
          <Route path="/payment/:taskId" element={<Payment />} />
          <Route path="/dashboard" element={<CombinedDashboard />} />
          <Route path="/user/dashboard" element={<CombinedDashboard />} />
          <Route path="/task/:taskId" element={<TaskWorkspace />} />
          <Route path="/refund/:taskId" element={<RefundSummary />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/editor/:taskId?" element={<RichTextEditorPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
