import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateComplaint from "./pages/CreateComplaint";
import ViewComplaints from "./pages/ViewComplaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import AgentQueue from "./pages/AgentQueue";
import EscalationDashboard from "./pages/EscalationDashboard";
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
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

        <Route path="/reports" element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "supervisor", "quality"]}>
              <Reports />
            </RoleRoute>
          </ProtectedRoute>
        } />

        {/* Catch-all → dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
