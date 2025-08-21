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
import UserDashboard from "./pages/UserDashboard";
import TaskEditor from "./pages/TaskEditor";
import TaskEditorPage from "./pages/TaskEditorPage";
import AdminDashboard from "./pages/AdminDashboard";
import DailyTextEditor from "./pages/DailyTextEditor";
import NoRushEditorPage from "./pages/NoRushEditorPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

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
          <Route path="/task-creation" element={
            <ProtectedRoute requiredRole="user">
              <TaskCreation />
            </ProtectedRoute>
          } />
          <Route path="/payment/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <Payment />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/user/dashboard" element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/combined-dashboard" element={
            <ProtectedRoute requiredRole="user">
              <CombinedDashboard />
            </ProtectedRoute>
          } />
          <Route path="/task-editor/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <TaskEditorPage />
            </ProtectedRoute>
          } />
          <Route path="/task/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <Payment />
            </ProtectedRoute>
          } />
          <Route path="/task-workspace/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <TaskWorkspace />
            </ProtectedRoute>
          } />
          <Route path="/refund/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <RefundSummary />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/daily-text-editor/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <DailyTextEditor />
            </ProtectedRoute>
          } />
          <Route path="/norush-editor/:taskId" element={
            <ProtectedRoute requiredRole="user">
              <NoRushEditorPage />
            </ProtectedRoute>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
