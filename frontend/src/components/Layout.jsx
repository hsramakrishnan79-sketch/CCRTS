import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import {
  FaHome, FaClipboardList, FaPlusCircle, FaUsers,
  FaExclamationTriangle, FaInbox, FaSignOutAlt, FaChartBar, FaUserCog, FaSpinner, FaClock, FaChartPie,
} from "react-icons/fa";
import NotificationBell from "./NotificationBell";
import { SCORE_COLOR } from "../utils/styleHelpers";

const ROLE_COLOR = {
  admin:      "#1e3c72",
  supervisor: "#6f42c1",
  agent:      "#28a745",
  customer:   "#fd7e14",
  quality:    "#17a2b8",
};

const PAGE_TITLES = {
  "/dashboard":               "Dashboard",
  "/view-complaints":         "All Complaints",
  "/admin/assignment-queue":  "Assignment Queue",
  "/admin/status-queue":      "Status Queue",
  "/escalation":              "Escalation Dashboard",
  "/sla-breached":            "SLA Breached",
  "/admin/users":             "User Management",
  "/admin/agent-categories":  "Agent Categories",
  "/admin/agent-workload":    "Agent Workload",
  "/reports":                 "Reports",
  "/agent-queue":             "My Queue",
  "/create-complaint":        "Submit Complaint",
  "/my-complaints":           "My Complaints",
};

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
    { label: "Agent Workload",   path: "/admin/agent-workload",    icon: <FaChartPie />,           indented: true },
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
    { label: "Agent Workload",   path: "/admin/agent-workload",    icon: <FaChartPie />,           indented: true },
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

  const pageTitle = location.pathname.startsWith("/complaint/")
    ? "Complaint Detail"
    : PAGE_TITLES[location.pathname] ?? "CCRTS";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f4f6f9" }}>

      {/* ── Top header ──────────────────────────────────────────────────── */}
      <header style={{
        height: "56px", background: "white", borderBottom: "1px solid #e9ecef",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0, zIndex: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {/* Left: page title + role badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#1e3c72" }}>{pageTitle}</span>
          <span style={{
            background: ROLE_COLOR[role] ?? "#1e3c72", color: "white",
            fontSize: "11px", fontWeight: 700, padding: "2px 10px",
            borderRadius: "12px", textTransform: "capitalize", letterSpacing: "0.5px",
          }}>
            {role}
          </span>
        </div>

        {/* Right: agent score + notifications + username + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {agentScore !== null && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              border: `2px solid ${SCORE_COLOR(agentScore.score)}`,
              borderRadius: "8px", padding: "2px 10px", lineHeight: 1.2,
            }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: SCORE_COLOR(agentScore.score) }}>
                {agentScore.score}
              </span>
              <span style={{ fontSize: "9px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Score
              </span>
            </div>
          )}

          <NotificationBell />

          <div style={{ fontSize: "13px", color: "#333", lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: "11px", color: "#aaa" }}>{user?.email}</div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "#dc3545", color: "white", border: "none",
              borderRadius: "6px", padding: "7px 14px", cursor: "pointer",
              fontSize: "13px", fontWeight: 600,
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + content ─────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar — nav only, no scrollbar needed */}
        <div style={{
          width: "200px", background: "#1e3c72", color: "white",
          padding: "20px 14px", display: "flex", flexDirection: "column",
          flexShrink: 0, overflowY: "auto",
        }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px", fontSize: "20px", letterSpacing: "1px" }}>CCRTS</h2>

          <nav>
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
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: "28px 24px", overflowY: "auto", minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}


export default Layout;
