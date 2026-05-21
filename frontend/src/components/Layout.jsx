import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome, FaClipboardList, FaPlusCircle, FaUsers,
  FaExclamationTriangle, FaInbox, FaSignOutAlt, FaChartBar,
} from "react-icons/fa";
import NotificationBell from "./NotificationBell";

// Nav items per role
const NAV = {
  admin: [
    { label: "Dashboard",        path: "/dashboard",        icon: <FaHome /> },
    { label: "Create Complaint", path: "/create-complaint", icon: <FaPlusCircle /> },
    { label: "All Complaints",   path: "/view-complaints",  icon: <FaClipboardList /> },
    { label: "Escalations",      path: "/escalation",       icon: <FaExclamationTriangle /> },
    { label: "Reports",          path: "/reports",          icon: <FaChartBar /> },
    { label: "User Management",  path: "/admin/users",      icon: <FaUsers /> },
  ],
  supervisor: [
    { label: "Dashboard",      path: "/dashboard",      icon: <FaHome /> },
    { label: "All Complaints", path: "/view-complaints", icon: <FaClipboardList /> },
    { label: "Escalations",    path: "/escalation",     icon: <FaExclamationTriangle /> },
    { label: "Reports",        path: "/reports",        icon: <FaChartBar /> },
  ],
  agent: [
    { label: "Dashboard",        path: "/dashboard",        icon: <FaHome /> },
    { label: "My Queue",         path: "/agent-queue",      icon: <FaInbox /> },
    { label: "Create Complaint", path: "/create-complaint", icon: <FaPlusCircle /> },
    { label: "All Complaints",   path: "/view-complaints",  icon: <FaClipboardList /> },
  ],
  customer: [
    { label: "Dashboard",        path: "/dashboard",        icon: <FaHome /> },
    { label: "Submit Complaint", path: "/create-complaint", icon: <FaPlusCircle /> },
  ],
  quality: [
    { label: "Dashboard",      path: "/dashboard",      icon: <FaHome /> },
    { label: "All Complaints", path: "/view-complaints", icon: <FaClipboardList /> },
    { label: "Reports",        path: "/reports",        icon: <FaChartBar /> },
  ],
};

function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user"));
  const role      = user?.role ?? "customer";
  const navItems  = NAV[role] ?? NAV.customer;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: "240px", background: "#1e3c72", color: "white",
        padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "4px", fontSize: "20px", letterSpacing: "1px" }}>CCRTS</h2>
        <p style={{ textAlign: "center", fontSize: "11px", opacity: 0.6, marginBottom: "28px", textTransform: "uppercase" }}>
          {role}
        </p>

        {/* Nav links */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  ...btnStyle,
                  background: active ? "rgba(255,255,255,0.18)" : "transparent",
                  fontWeight: active ? 700 : 400,
                }}
              >
                <span style={{ opacity: 0.85 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Notification bell */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "14px", marginTop: "14px" }}>
          <NotificationBell />
        </div>

        {/* User info + logout */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "14px", marginTop: "8px" }}>
          <div style={{ textAlign: "center", marginBottom: "10px", fontSize: "13px", opacity: 0.85 }}>
            <strong>{user?.name}</strong>
            <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px" }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} style={{ ...btnStyle, background: "rgba(220,53,69,0.75)" }}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "36px", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

const btnStyle = {
  width: "100%", padding: "11px 14px", marginBottom: "6px",
  border: "none", borderRadius: "8px", color: "white",
  display: "flex", alignItems: "center", gap: "10px",
  cursor: "pointer", fontSize: "14px", textAlign: "left", transition: "background 0.15s",
};

export default Layout;
