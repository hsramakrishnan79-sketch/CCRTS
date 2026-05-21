import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  FaClipboardList, FaExclamationTriangle, FaSpinner,
  FaCheckCircle, FaArrowUp, FaClock, FaInbox, FaUsers,
} from "react-icons/fa";

// ── Shared card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, gradient, light }) {
  return (
    <div style={{ borderRadius: "16px", padding: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", textAlign: "center", background: gradient, color: light ? "#333" : "white" }}>
      {icon}
      <h3 style={{ margin: "10px 0 4px", fontSize: "13px" }}>{label}</h3>
      <h1 style={{ margin: 0, fontSize: "34px" }}>{value ?? "—"}</h1>
    </div>
  );
}

function QuickLink({ label, path, icon, color }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", background: "white", border: `2px solid ${color}`, borderRadius: "12px", cursor: "pointer", color, fontWeight: 600, fontSize: "15px", width: "100%" }}
    >
      {icon} {label}
    </button>
  );
}

// ── Admin / Supervisor / Quality dashboard ───────────────────────────────────
function GlobalDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get("/complaints/stats").then((r) => setStats(r.data)).catch(console.error);
  }, []);

  const s = stats ?? {};
  const cards = [
    { label: "Total",      value: s.total,      icon: <FaClipboardList size={30} />, gradient: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { label: "Open",       value: s.open,        icon: <FaClipboardList size={30} />, gradient: "linear-gradient(135deg,#6c757d,#adb5bd)" },
    { label: "In Progress",value: s.inProgress,  icon: <FaSpinner size={30} />,       gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
    { label: "Escalated",  value: s.escalated,   icon: <FaArrowUp size={30} />,       gradient: "linear-gradient(135deg,#f7971e,#ffd200)", light: true },
    { label: "Resolved",   value: s.resolved,    icon: <FaCheckCircle size={30} />,   gradient: "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Closed",     value: s.closed,      icon: <FaCheckCircle size={30} />,   gradient: "linear-gradient(135deg,#4b6cb7,#182848)" },
    {
      label: "SLA Breaches", value: s.slaBreaches, icon: <FaExclamationTriangle size={30} />,
      gradient: s.slaBreaches > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)",
    },
    { label: "Avg Resolution", value: s.avgResolutionHours != null ? `${s.avgResolutionHours}h` : "—", icon: <FaClock size={30} />, gradient: "linear-gradient(135deg,#834d9b,#d04ed6)" },
  ];

  return (
    <>
      <h1 style={{ marginBottom: "4px" }}>Welcome, {user?.name}</h1>
      <p style={{ color: "#888", marginBottom: "28px", textTransform: "capitalize" }}>Role: {user?.role}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "18px", marginBottom: "32px" }}>
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {["admin", "supervisor"].includes(user?.role) && (
        <>
          <h3 style={{ marginBottom: "14px", color: "#1e3c72" }}>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px" }}>
            <QuickLink label="Escalation Dashboard" path="/escalation"   icon={<FaExclamationTriangle />} color="#dc3545" />
            <QuickLink label="All Complaints"        path="/view-complaints" icon={<FaClipboardList />}      color="#1e3c72" />
            {user?.role === "admin" && (
              <QuickLink label="User Management" path="/admin/users" icon={<FaUsers />} color="#6f42c1" />
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Agent dashboard ──────────────────────────────────────────────────────────
function AgentDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get("/complaints/my-stats").then((r) => setStats(r.data)).catch(console.error);
  }, []);

  const s = stats ?? {};
  const cards = [
    { label: "Assigned To Me", value: s.assigned,   icon: <FaInbox size={30} />,       gradient: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { label: "In Progress",    value: s.inProgress,  icon: <FaSpinner size={30} />,      gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
    { label: "Escalated",      value: s.escalated,   icon: <FaArrowUp size={30} />,      gradient: "linear-gradient(135deg,#f7971e,#ffd200)", light: true },
    { label: "Resolved By Me", value: s.resolved,    icon: <FaCheckCircle size={30} />,  gradient: "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Avg Resolution", value: s.avgResolutionHours != null ? `${s.avgResolutionHours}h` : "—", icon: <FaClock size={30} />, gradient: "linear-gradient(135deg,#834d9b,#d04ed6)" },
  ];

  return (
    <>
      <h1 style={{ marginBottom: "4px" }}>Welcome, {user?.name}</h1>
      <p style={{ color: "#888", marginBottom: "28px" }}>Your personal work summary</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "18px", marginBottom: "32px" }}>
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <h3 style={{ marginBottom: "14px", color: "#1e3c72" }}>Quick Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px" }}>
        <QuickLink label="My Work Queue"     path="/agent-queue"      icon={<FaInbox />}       color="#1e3c72" />
        <QuickLink label="Create Complaint"  path="/create-complaint" icon={<FaClipboardList />} color="#28a745" />
      </div>
    </>
  );
}

// ── Customer dashboard ───────────────────────────────────────────────────────
function CustomerDashboard({ user }) {
  return (
    <>
      <h1 style={{ marginBottom: "4px" }}>Welcome, {user?.name}</h1>
      <p style={{ color: "#888", marginBottom: "32px" }}>How can we help you today?</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "20px" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 15px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <FaClipboardList size={40} color="#1e3c72" />
          <h3 style={{ margin: "16px 0 8px" }}>Submit a Complaint</h3>
          <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>Report an issue and get it resolved quickly.</p>
          <QuickLink label="Submit Complaint" path="/create-complaint" icon={<FaClipboardList />} color="#1e3c72" />
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 15px rgba(0,0,0,0.07)", textAlign: "center" }}>
          <FaClock size={40} color="#28a745" />
          <h3 style={{ margin: "16px 0 8px" }}>SLA Commitments</h3>
          <div style={{ textAlign: "left", fontSize: "14px", color: "#555" }}>
            {[["Critical","4 hours"],["High","24 hours"],["Medium","48 hours"],["Low","72 hours"]].map(([p, t]) => (
              <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span>{p}</span><strong>{t}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <Layout>
      {role === "agent"    ? <AgentDashboard    user={user} /> :
       role === "customer" ? <CustomerDashboard user={user} /> :
                             <GlobalDashboard   user={user} />}
    </Layout>
  );
}
