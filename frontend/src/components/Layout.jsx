import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import {
  FaHome, FaClipboardList, FaPlusCircle, FaUsers,
  FaExclamationTriangle, FaInbox, FaSignOutAlt, FaChartBar, FaUserCog, FaSpinner, FaClock,
} from "react-icons/fa";
import NotificationBell from "./NotificationBell";

// Nav items per role
const NAV = {
  admin: [
    { label: "Dashboard",        path: "/dashboard",               icon: <FaHome /> },
    { groupLabel: "Complaints" },
    { label: "All Complaints",    path: "/view-complaints",           icon: <FaClipboardList />,      indented: true },
    { label: "Assignment Queue",  path: "/admin/assignment-queue",    icon: <FaInbox />,              indented: true },
    { label: "Status Queue",      path: "/admin/status-queue",        icon: <FaSpinner />,            indented: true },
    { label: "Escalations",       path: "/escalation",                icon: <FaExclamationTriangle />, indented: true },
    { label: "SLA Breached",      path: "/sla-breached",              icon: <FaClock />,              indented: true },
    { groupLabel: "Administration" },
    { label: "User Management",  path: "/admin/users",             icon: <FaUsers />,              indented: true },
    { label: "Agent Categories", path: "/admin/agent-categories",  icon: <FaUserCog />,            indented: true },
    { label: "Reports",          path: "/reports",                 icon: <FaChartBar /> },
  ],
  supervisor: [
    { label: "Dashboard",        path: "/dashboard",               icon: <FaHome /> },
    { groupLabel: "Complaints" },
    { label: "All Complaints",   path: "/view-complaints",          icon: <FaClipboardList />,       indented: true },
    { label: "Assignment Queue", path: "/admin/assignment-queue",   icon: <FaInbox />,               indented: true },
    { label: "Status Queue",     path: "/admin/status-queue",       icon: <FaSpinner />,             indented: true },
    { label: "Escalations",      path: "/escalation",               icon: <FaExclamationTriangle />, indented: true },
    { label: "SLA Breached",     path: "/sla-breached",              icon: <FaClock />,              indented: true },
    { label: "Reports",          path: "/reports",                 icon: <FaChartBar /> },
  ],
  agent: [
    { label: "Dashboard",        path: "/dashboard",        icon: <FaHome /> },
    { label: "My Queue",         path: "/agent-queue",      icon: <FaInbox /> },
    { label: "Create Complaint", path: "/create-complaint", icon: <FaPlusCircle /> },
  ],
  customer: [
    { label: "Dashboard",        path: "/dashboard",        icon: <FaHome /> },
    { label: "My Complaints",    path: "/my-complaints",    icon: <FaClipboardList /> },
    { label: "Submit Complaint", path: "/create-complaint", icon: <FaPlusCircle /> },
  ],
  quality: [
    { label: "Dashboard",      path: "/dashboard",      icon: <FaHome /> },
    { label: "All Complaints", path: "/view-complaints", icon: <FaClipboardList /> },
    { label: "Reports",        path: "/reports",        icon: <FaChartBar /> },
  ],
};

const SCORE_COLOR = (s) => s >= 80 ? "#28a745" : s >= 60 ? "#fd7e14" : "#dc3545";

function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user"));
  const role      = user?.role ?? "customer";
  const navItems  = NAV[role] ?? NAV.customer;

  const [agentScore, setAgentScore] = useState(null);

  useEffect(() => {
    if (role === "agent") {
      API.get("/users/my-score").then((r) => setAgentScore(r.data)).catch(() => {});
    }
  }, [role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: "200px", background: "#1e3c72", color: "white",
        padding: "20px 14px", display: "flex", flexDirection: "column", flexShrink: 0,
        height: "100vh", position: "sticky", top: 0, overflowY: "auto",
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "4px", fontSize: "20px", letterSpacing: "1px" }}>CCRTS</h2>
        <p style={{ textAlign: "center", fontSize: "11px", opacity: 0.6, marginBottom: "28px", textTransform: "uppercase" }}>
          {role}
        </p>

        {/* Nav links */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item, idx) => {
            if (item.groupLabel) {
              return (
                <div key={idx} style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "1.2px",
                  textTransform: "uppercase", opacity: 0.45,
                  padding: "14px 12px 4px",
                }}>
                  {item.groupLabel}
                </div>
              );
            }
            const active = (location.pathname + location.search) === item.path || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-btn${active ? " active" : ""}`}
                style={item.indented ? { paddingLeft: "22px" } : undefined}
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
          {agentScore !== null && (
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{
                display: "inline-flex", flexDirection: "column", alignItems: "center",
                background: "rgba(255,255,255,0.08)", borderRadius: "10px", padding: "8px 16px",
                border: `2px solid ${SCORE_COLOR(agentScore.score)}`,
              }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: SCORE_COLOR(agentScore.score), lineHeight: 1 }}>
                  {agentScore.score}
                </span>
                <span style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Performance Score
                </span>
                <span style={{ fontSize: "9px", opacity: 0.45, marginTop: "1px" }}>
                  {agentScore.period}
                </span>
              </div>
            </div>
          )}
          <div style={{ textAlign: "center", marginBottom: "10px", fontSize: "13px", opacity: 0.85 }}>
            <strong>{user?.name}</strong>
            <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px" }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="nav-btn" style={{ background: "rgba(220,53,69,0.75)" }}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "28px 24px", overflowY: "auto", minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}


export default Layout;
