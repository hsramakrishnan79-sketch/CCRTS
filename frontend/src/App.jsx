import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateComplaint from "./pages/CreateComplaint";
import ViewComplaints from "./pages/ViewComplaints";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={
          <ProtectedRoute>
          <Dashboard />
         </ProtectedRoute>
          }
        />

  <Route
    path="/create-complaint"
    element={
      <ProtectedRoute>
        <CreateComplaint />
      </ProtectedRoute>
    }
  />

  <Route
    path="/view-complaints"
    element={
      <ProtectedRoute>
        <ViewComplaints />
      </ProtectedRoute>
    }
  />
</Routes>
    </BrowserRouter>
  );
}

export default App;