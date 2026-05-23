import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateComplaint from "./pages/CreateComplaint";
import ViewComplaints from "./pages/ViewComplaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import AgentQueue from "./pages/AgentQueue";
import EscalationDashboard from "./pages/EscalationDashboard";
import UserManagement from "./pages/UserManagement";
import AgentCategories from "./pages/AgentCategories";
import MyComplaints from "./pages/MyComplaints";
import Reports from "./pages/Reports";
import AdminAssignmentQueue from "./pages/AdminAssignmentQueue";
import AdminStatusQueue from "./pages/AdminStatusQueue";
import SlaBreached from "./pages/SlaBreached";
import ProtectedRoute from "./components/ProtectedRoute";

// Redirects to /dashboard if the user's role is not in the allowed list
function RoleRoute({ roles, children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/create-complaint" element={
          <ProtectedRoute><CreateComplaint /></ProtectedRoute>
        } />

        <Route path="/view-complaints" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin","agent","supervisor","quality"]}>
              <ViewComplaints />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/complaint/:complaint_id" element={
          <ProtectedRoute><ComplaintDetail /></ProtectedRoute>
        } />

        <Route path="/agent-queue" element={
          <ProtectedRoute>
            <RoleRoute roles={["agent"]}>
              <AgentQueue />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/escalation" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin","supervisor"]}>
              <EscalationDashboard />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin"]}>
              <UserManagement />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/admin/agent-categories" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin"]}>
              <AgentCategories />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/admin/assignment-queue" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "supervisor"]}>
              <AdminAssignmentQueue />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/admin/status-queue" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "supervisor"]}>
              <AdminStatusQueue />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/sla-breached" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "supervisor"]}>
              <SlaBreached />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "supervisor", "quality"]}>
              <Reports />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/my-complaints" element={
          <ProtectedRoute>
            <RoleRoute roles={["customer"]}>
              <MyComplaints />
            </RoleRoute>
          </ProtectedRoute>
        } />

        {/* Catch-all → dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
