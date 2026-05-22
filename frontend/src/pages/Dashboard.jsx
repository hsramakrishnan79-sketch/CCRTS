import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  FaClipboardList, FaExclamationTriangle, FaSpinner,
  FaCheckCircle, FaArrowUp, FaClock, FaInbox, FaUsers, FaRedo,
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
    {
      label: "Reopened", value: s.reopened, icon: <FaRedo size={30} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)",
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
    {
      label: "Reopened", value: s.reopened, icon: <FaRedo size={30} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)",
    },
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
const ACTIVE_STATUSES = ["Open", "Assigned", "In Progress", "Pending Customer Response", "Escalated"];

function CustomerDashboard({ user }) {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/complaints/my-complaints")
      .then((r) => setComplaints(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total    = complaints.length;
  const active   = complaints.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const closed   = complaints.filter((c) => c.status === "Closed").length;

  const recent = complaints.slice(0, 5);

  const STATUS_COLOR = {
    "Open": "#6c757d", "Assigned": "#004085", "In Progress": "#0c5460",
    "Pending Customer Response": "#856404", "Escalated": "#721c24",
    "Resolved": "#155724", "Closed": "#1b1e21",
  };

  return (
    <>
      <h1 style={{ marginBottom: "4px" }}>Welcome, {user?.name}</h1>
      <p style={{ color: "#888", marginBottom: "28px" }}>Here's a summary of your complaints</p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard label="Total Submitted" value={loading ? "…" : total}    icon={<FaClipboardList size={28} />} gradient="linear-gradient(135deg,#1e3c72,#2a5298)" />
        <StatCard label="Active"          value={loading ? "…" : active}   icon={<FaSpinner size={28} />}       gradient="linear-gradient(135deg,#36d1dc,#5b86e5)" />
        <StatCard label="Resolved"        value={loading ? "…" : resolved} icon={<FaCheckCircle size={28} />}   gradient="linear-gradient(135deg,#56ab2f,#a8e063)" />
        <StatCard label="Closed"          value={loading ? "…" : closed}   icon={<FaCheckCircle size={28} />}   gradient="linear-gradient(135deg,#4b6cb7,#182848)" />
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px", marginBottom: "28px" }}>
        <QuickLink label="My Complaints"    path="/my-complaints"    icon={<FaClipboardList />} color="#1e3c72" />
        <QuickLink label="Submit Complaint" path="/create-complaint" icon={<FaClipboardList />} color="#28a745" />
      </div>

      {/* Recent complaints */}
      {!loading && recent.length > 0 && (
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: "#1e3c72", marginBottom: "16px", fontSize: "15px" }}>Recent Complaints</h3>
          {recent.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/complaint/${c.complaint_id}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "#1e3c72" }}>{c.complaint_id}</strong>
                <span style={{ fontSize: "12px", color: "#888", marginLeft: "10px" }}>{c.category}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: STATUS_COLOR[c.status] ?? "#555" }}>
                {c.status}
              </span>
            </div>
          ))}
          {complaints.length > 5 && (
            <button
              onClick={() => navigate("/my-complaints")}
              style={{ marginTop: "12px", background: "none", border: "none", color: "#2a5298", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
            >
              View all {complaints.length} complaints →
            </button>
          )}
        </div>
      )}

      {/* SLA reference */}
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginTop: "20px" }}>
        <h3 style={{ color: "#1e3c72", marginBottom: "14px", fontSize: "15px" }}>SLA Commitments</h3>
        {[["Critical","4 hours"],["High","24 hours"],["Medium","48 hours"],["Low","72 hours"]].map(([p, t]) => (
          <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px", color: "#555" }}>
            <span>{p}</span><strong>{t}</strong>
          </div>
        ))}
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
