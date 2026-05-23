import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  FaClipboardList, FaExclamationTriangle, FaSpinner,
  FaCheckCircle, FaArrowUp, FaClock, FaInbox,
  FaUsers, FaRedo, FaStar, FaChartBar,
} from "react-icons/fa";

// ── Shared components ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon, gradient, light, onClick, sub }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "16px", padding: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        textAlign: "center", background: gradient, color: light ? "#333" : "white",
        cursor: onClick ? "pointer" : "default", transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
    >
      {icon}
      <h3 style={{ margin: "10px 0 4px", fontSize: "13px" }}>{label}</h3>
      <h1 style={{ margin: 0, fontSize: "34px" }}>{value ?? "—"}</h1>
      {sub && <p style={{ margin: "4px 0 0", fontSize: "11px", opacity: 0.8 }}>{sub}</p>}
    </div>
  );
}

function QuickLink({ label, path, icon, color }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "16px 20px", background: "white",
        border: `2px solid ${color}`, borderRadius: "12px",
        cursor: "pointer", color, fontWeight: 600, fontSize: "15px", width: "100%",
      }}
    >
      {icon} {label}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-primary mb-16" style={{ marginTop: "32px" }}>{children}</h3>
  );
}

// ── Vertical bar chart ────────────────────────────────────────────────────────
function VBars({ data, keyX, keyY, color = "#1e3c72", height = 120 }) {
  const max = Math.max(...data.map((d) => d[keyY] ?? 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#555" }}>
            {d[keyY] > 0 ? d[keyY] : ""}
          </span>
          <div
            style={{
              width: "100%", background: color, borderRadius: "4px 4px 0 0",
              height: `${((d[keyY] ?? 0) / max) * (height - 30)}px`,
              minHeight: (d[keyY] ?? 0) > 0 ? "4px" : "0",
            }}
          />
          <span style={{ fontSize: "9px", color: "#aaa", whiteSpace: "nowrap" }}>
            {String(d[keyX]).slice(-5)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, count, max, color = "#1e3c72" }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      <span style={{ width: "160px", fontSize: "13px", color: "#555", flexShrink: 0, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <span style={{ width: "30px", fontWeight: 700, fontSize: "13px", color }}>{count}</span>
    </div>
  );
}

// ── Agent performance tables (shared by Admin + Quality) ─────────────────────
const SCORE_COLOR = (s) => s >= 80 ? "#28a745" : s >= 60 ? "#fd7e14" : "#dc3545";
const SCORE_BG    = (s) => s >= 80 ? "#f0fff4" : s >= 60 ? "#fff8f0" : "#fff5f5";

function AgentPerformanceTables() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard/agent-performance")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted text-sm">Loading agent performance...</p>;
  if (!data || data.agents.length === 0) return <p className="text-muted text-sm">No agent activity in the last 30 days.</p>;

  const top      = data.agents.slice(0, 5);
  const watchlist = data.agents.filter((a) => a.score < 60);

  const cols = ["Agent", "Handled", "Avg Rating", "SLA Compliance", "Reopened", "Score"];

  const AgentTable = ({ agents, emptyMsg }) => (
    agents.length === 0
      ? <p className="text-muted text-sm">{emptyMsg}</p>
      : <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr>{cols.map((c) => <th key={c} style={{ textAlign: c === "Agent" ? "left" : "center" }}>{c}</th>)}</tr></thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} style={{ background: SCORE_BG(a.score) }}>
                  <td style={{ fontWeight: 600 }}>{a.agent}</td>
                  <td style={{ textAlign: "center" }}>{a.totalHandled}</td>
                  <td style={{ textAlign: "center" }}>{a.avgRating != null ? `${a.avgRating} ★` : "—"}</td>
                  <td style={{ textAlign: "center" }}>{a.slaCompliance != null ? `${a.slaCompliance}%` : "—"}</td>
                  <td style={{ textAlign: "center", color: a.reopened > 0 ? "#dc3545" : undefined }}>{a.reopened}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "15px", color: SCORE_COLOR(a.score) }}>{a.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div className="card">
          <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "16px" }}>
            Top Performers <span style={{ fontSize: "11px", fontWeight: 400, opacity: 0.5 }}>— {data.period}</span>
          </h3>
          <AgentTable agents={top} emptyMsg="No agent data available." />
        </div>
        <div className="card">
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#dc3545", borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "16px" }}>
            Performance Watch List <span style={{ fontSize: "11px", fontWeight: 400, opacity: 0.5 }}>— score below 60</span>
          </h3>
          <AgentTable agents={watchlist} emptyMsg="✓ All agents are above the performance threshold." />
        </div>
      </div>
    </>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard/admin")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s   = data?.stats ?? {};
  const toFilter = (f) => () => navigate(`/view-complaints${f ? `?filter=${encodeURIComponent(f)}` : ""}`);

  const currentCards = [
    { label: "Open",         value: s.open,        icon: <FaClipboardList size={28} />, gradient: "linear-gradient(135deg,#6c757d,#adb5bd)", onClick: toFilter("Open") },
    { label: "In Progress",  value: s.inProgress,  icon: <FaSpinner size={28} />,       gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)", onClick: toFilter("In Progress") },
    { label: "Escalated",    value: s.escalated,   icon: <FaArrowUp size={28} />,       gradient: "linear-gradient(135deg,#f7971e,#ffd200)", light: true, onClick: toFilter("Escalated") },
    { label: "SLA Breaches", value: s.slaBreaches, icon: <FaExclamationTriangle size={28} />,
      gradient: s.slaBreaches > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)", onClick: toFilter("sla") },
  ];

  const historyCards = [
    { label: "Total",          value: s.total,    icon: <FaClipboardList size={28} />, gradient: "linear-gradient(135deg,#1e3c72,#2a5298)", onClick: toFilter("") },
    { label: "Resolved",       value: s.resolved, icon: <FaCheckCircle size={28} />,   gradient: "linear-gradient(135deg,#56ab2f,#a8e063)", onClick: toFilter("Resolved") },
    { label: "Closed",         value: s.closed,   icon: <FaCheckCircle size={28} />,   gradient: "linear-gradient(135deg,#4b6cb7,#182848)", onClick: toFilter("Closed") },
    { label: "Reopened",       value: s.reopened, icon: <FaRedo size={28} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Avg Resolution", value: s.avgResolutionHours != null ? `${s.avgResolutionHours}h` : "—",
      icon: <FaClock size={28} />, gradient: "linear-gradient(135deg,#834d9b,#d04ed6)" },
  ];

  return (
    <>
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">System-wide overview — {user?.name}</p>

      {loading ? <p className="text-muted">Loading...</p> : (
        <>
          <SectionTitle>Current Status</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {currentCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          <SectionTitle>All-Time Summary</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {historyCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          {/* Monthly trend */}
          <div className="card mb-24">
            <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
              Monthly Complaint Volume (Last 12 Months)
            </h3>
            {data?.monthlyTrend?.length > 0
              ? <VBars data={data.monthlyTrend} keyX="month" keyY="total" color="#1e3c72" height={150} />
              : <p className="text-muted text-sm">No data yet.</p>}
          </div>

          {/* By category */}
          <div className="card mb-24">
            <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
              Complaints by Category
            </h3>
            {(data?.byCategory ?? []).map((c) => (
              <HBar key={c.category} label={c.category} count={c.count} max={Math.max(...(data?.byCategory ?? []).map((x) => x.count), 1)} />
            ))}
          </div>

          <SectionTitle>Quick Actions</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
            <QuickLink label="Escalation Dashboard" path="/escalation"      icon={<FaExclamationTriangle />} color="#dc3545" />
            <QuickLink label="All Complaints"       path="/view-complaints" icon={<FaClipboardList />}       color="#1e3c72" />
            <QuickLink label="User Management"      path="/admin/users"     icon={<FaUsers />}               color="#6f42c1" />
            <QuickLink label="Reports"              path="/reports"         icon={<FaChartBar />}            color="#20c997" />
          </div>

          <SectionTitle>Agent Performance — Last 30 Days</SectionTitle>
          <AgentPerformanceTables />
        </>
      )}
    </>
  );
}

// ── SUPERVISOR DASHBOARD ──────────────────────────────────────────────────────
function SupervisorDashboard({ user }) {
  const navigate  = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard/supervisor")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = data?.stats ?? {};

  const currentCards = [
    { label: "Open",         value: s.open,        icon: <FaClipboardList size={28} />, gradient: "linear-gradient(135deg,#6c757d,#adb5bd)" },
    { label: "In Progress",  value: s.inProgress,  icon: <FaSpinner size={28} />,       gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
    { label: "Escalated",    value: s.escalated,   icon: <FaArrowUp size={28} />,       gradient: s.escalated > 0 ? "linear-gradient(135deg,#f7971e,#ffd200)" : "linear-gradient(135deg,#56ab2f,#a8e063)", light: s.escalated > 0 },
    { label: "SLA Breaches", value: s.slaBreaches, icon: <FaExclamationTriangle size={28} />,
      gradient: s.slaBreaches > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)" },
  ];

  const historyCards = [
    { label: "Reopened", value: s.reopened, icon: <FaRedo size={28} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)" },
  ];

  return (
    <>
      <h1 className="page-title">Supervisor Dashboard</h1>
      <p className="page-subtitle">Operational view — {user?.name}</p>

      {loading ? <p className="text-muted">Loading...</p> : (
        <>
          <SectionTitle>Current Status</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {currentCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          <SectionTitle>All-Time Summary</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {historyCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          {/* Daily trend */}
          <div className="card mb-24">
            <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
              Daily Complaint Volume (Last 14 Days)
            </h3>
            {data?.dailyTrend?.length > 0
              ? <VBars data={data.dailyTrend} keyX="day" keyY="total" color="#2a5298" height={140} />
              : <p className="text-muted text-sm">No data in this period.</p>}
          </div>

          {/* Agent workload */}
          <div className="card mb-24">
            <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "16px" }}>
              Agent Workload (Active Complaints)
            </h3>
            {(data?.agentWorkload ?? []).length === 0 ? (
              <p className="text-muted text-sm">No active assignments.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th style={{ textAlign: "center" }}>Assigned</th>
                      <th style={{ textAlign: "center" }}>In Progress</th>
                      <th style={{ textAlign: "center" }}>Escalated</th>
                      <th style={{ textAlign: "center" }}>Resolved</th>
                      <th style={{ textAlign: "center" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agentWorkload.map((a) => (
                      <tr key={a.agent}>
                        <td style={{ fontWeight: 600 }}>{a.agent}</td>
                        <td style={{ textAlign: "center" }}>{a.assigned}</td>
                        <td style={{ textAlign: "center" }}>{a.inProgress}</td>
                        <td style={{ textAlign: "center", color: a.escalated > 0 ? "#dc3545" : undefined, fontWeight: a.escalated > 0 ? 700 : 400 }}>{a.escalated}</td>
                        <td style={{ textAlign: "center", color: "#28a745" }}>{a.resolved}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{a.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <SectionTitle>Quick Actions</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
            <QuickLink label="Escalation Dashboard" path="/escalation"             icon={<FaExclamationTriangle />} color="#dc3545" />
            <QuickLink label="Assignment Queue"     path="/admin/assignment-queue" icon={<FaInbox />}               color="#1e3c72" />
            <QuickLink label="Status Queue"         path="/admin/status-queue"     icon={<FaSpinner />}             color="#0c5460" />
            <QuickLink label="All Complaints"       path="/view-complaints"        icon={<FaClipboardList />}       color="#555" />
          </div>
        </>
      )}
    </>
  );
}

// ── QUALITY DASHBOARD ─────────────────────────────────────────────────────────
function QualityDashboard({ user }) {
  const navigate  = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/dashboard/quality")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = data?.stats ?? {};
  const maxRating = Math.max(...(data?.ratingDistribution ?? []).map((r) => r.count), 1);

  const STAR_COLOR = { 5: "#28a745", 4: "#56ab2f", 3: "#ffc107", 2: "#fd7e14", 1: "#dc3545" };

  const currentCards = [
    { label: "SLA Compliance",   value: s.slaComplianceRate != null ? `${s.slaComplianceRate}%` : "—",
      icon: <FaClock size={28} />,
      gradient: (s.slaComplianceRate ?? 0) >= 80 ? "linear-gradient(135deg,#56ab2f,#a8e063)" : "linear-gradient(135deg,#cb2d3e,#ef473a)" },
    { label: "Pending Feedback", value: s.pendingFeedback, icon: <FaExclamationTriangle size={28} />,
      gradient: s.pendingFeedback > 0 ? "linear-gradient(135deg,#f7971e,#ffd200)" : "linear-gradient(135deg,#56ab2f,#a8e063)", light: s.pendingFeedback > 0,
      sub: "resolved >7 days, no feedback" },
  ];

  const historyCards = [
    { label: "Avg Feedback Rating",      value: s.avgRating ?? "—",       icon: <FaStar size={28} />,
      gradient: "linear-gradient(135deg,#f7971e,#ffd200)", light: true, sub: "out of 5" },
    { label: "Total Feedback",           value: s.totalFeedback,           icon: <FaClipboardList size={28} />, gradient: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { label: "Reopened",                 value: s.reopened,                icon: <FaRedo size={28} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Cross-Category Overrides", value: s.crossCategoryCount,     icon: <FaArrowUp size={28} />,
      gradient: "linear-gradient(135deg,#834d9b,#d04ed6)" },
  ];

  return (
    <>
      <h1 className="page-title">Quality Dashboard</h1>
      <p className="page-subtitle">Service quality & satisfaction trends — {user?.name}</p>

      {loading ? <p className="text-muted">Loading...</p> : (
        <>
          <SectionTitle>Current Status</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {currentCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          <SectionTitle>All-Time Summary</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {historyCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>

          {/* Daily feedback trend */}
          <div className="card mb-24">
            <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
              Daily Avg Feedback Rating (Last 14 Days)
            </h3>
            {(data?.dailyFeedback ?? []).length > 0
              ? <VBars data={data.dailyFeedback} keyX="day" keyY="avgRating" color="#f7971e" height={140} />
              : <p className="text-muted text-sm">No feedback data in this period.</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            {/* Rating distribution */}
            <div className="card">
              <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
                Feedback Rating Distribution
              </h3>
              {(data?.ratingDistribution ?? []).length === 0 ? (
                <p className="text-muted text-sm">No feedback yet.</p>
              ) : (
                [5, 4, 3, 2, 1].map((r) => {
                  const entry = data.ratingDistribution.find((x) => x.rating === r);
                  return (
                    <HBar key={r} label={`${"★".repeat(r)} ${r} star`} count={entry?.count ?? 0} max={maxRating} color={STAR_COLOR[r]} />
                  );
                })
              )}
            </div>

            {/* SLA compliance by category */}
            <div className="card">
              <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
                SLA Compliance by Category
              </h3>
              {(data?.slaByCategory ?? []).length === 0 ? (
                <p className="text-muted text-sm">No resolved complaints yet.</p>
              ) : (
                data.slaByCategory.map((c) => (
                  <div key={c.category} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ width: "160px", fontSize: "13px", color: "#555", flexShrink: 0, textAlign: "right" }}>{c.category}</span>
                    <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                      <div style={{ width: `${c.complianceRate}%`, background: c.complianceRate >= 80 ? "#28a745" : c.complianceRate >= 50 ? "#ffc107" : "#dc3545", height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
                    </div>
                    <span style={{ width: "40px", fontWeight: 700, fontSize: "13px", color: c.complianceRate >= 80 ? "#28a745" : c.complianceRate >= 50 ? "#ffc107" : "#dc3545" }}>{c.complianceRate}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <SectionTitle>Quick Actions</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
            <QuickLink label="Reports"         path="/reports"         icon={<FaChartBar />}      color="#20c997" />
            <QuickLink label="All Complaints"  path="/view-complaints" icon={<FaClipboardList />} color="#1e3c72" />
          </div>

          <SectionTitle>Agent Performance — Last 30 Days</SectionTitle>
          <AgentPerformanceTables />
        </>
      )}
    </>
  );
}

// ── AGENT DASHBOARD ───────────────────────────────────────────────────────────
function AgentDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get("/complaints/my-stats").then((r) => setStats(r.data)).catch(console.error);
  }, []);

  const s = stats ?? {};
  const currentCards = [
    { label: "Assigned To Me", value: s.assigned,  icon: <FaInbox size={28} />,  gradient: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { label: "In Progress",    value: s.inProgress, icon: <FaSpinner size={28} />, gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
    { label: "Escalated",      value: s.escalated,  icon: <FaArrowUp size={28} />, gradient: "linear-gradient(135deg,#f7971e,#ffd200)", light: true },
  ];

  const historyCards = [
    { label: "Resolved By Me", value: s.resolved,  icon: <FaCheckCircle size={28} />, gradient: "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Reopened",       value: s.reopened,  icon: <FaRedo size={28} />,
      gradient: s.reopened > 0 ? "linear-gradient(135deg,#cb2d3e,#ef473a)" : "linear-gradient(135deg,#56ab2f,#a8e063)" },
    { label: "Avg Resolution", value: s.avgResolutionHours != null ? `${s.avgResolutionHours}h` : "—",
      icon: <FaClock size={28} />, gradient: "linear-gradient(135deg,#834d9b,#d04ed6)" },
  ];

  return (
    <>
      <h1 className="page-title">Welcome, {user?.name}</h1>
      <p className="page-subtitle">Your personal work summary</p>
      <SectionTitle>Current Status</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
        {currentCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      <SectionTitle>All-Time Summary</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "32px" }}>
        {historyCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      <SectionTitle>Quick Actions</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px" }}>
        <QuickLink label="My Work Queue"    path="/agent-queue"      icon={<FaInbox />}        color="#1e3c72" />
        <QuickLink label="Create Complaint" path="/create-complaint" icon={<FaClipboardList />} color="#28a745" />
      </div>
    </>
  );
}

// ── CUSTOMER DASHBOARD ────────────────────────────────────────────────────────
const ACTIVE_STATUSES = ["Open", "Assigned", "In Progress", "Pending Customer Response", "Escalated"];
const STATUS_COLOR = {
  "Open": "#6c757d", "Assigned": "#004085", "In Progress": "#0c5460",
  "Pending Customer Response": "#856404", "Escalated": "#721c24",
  "Resolved": "#155724", "Closed": "#1b1e21",
};

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
  const recent   = complaints.slice(0, 5);

  return (
    <>
      <h1 className="page-title">Welcome, {user?.name}</h1>
      <p className="page-subtitle">Here's a summary of your complaints</p>

      <SectionTitle>Current Status</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard label="Active" value={loading ? "…" : active} icon={<FaSpinner size={28} />} gradient="linear-gradient(135deg,#36d1dc,#5b86e5)" />
      </div>

      <SectionTitle>All-Time Summary</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard label="Total Submitted" value={loading ? "…" : total}    icon={<FaClipboardList size={28} />} gradient="linear-gradient(135deg,#1e3c72,#2a5298)" />
        <StatCard label="Resolved"        value={loading ? "…" : resolved} icon={<FaCheckCircle size={28} />}   gradient="linear-gradient(135deg,#56ab2f,#a8e063)" />
        <StatCard label="Closed"          value={loading ? "…" : closed}   icon={<FaCheckCircle size={28} />}   gradient="linear-gradient(135deg,#4b6cb7,#182848)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px", marginBottom: "28px" }}>
        <QuickLink label="My Complaints"    path="/my-complaints"    icon={<FaClipboardList />} color="#1e3c72" />
        <QuickLink label="Submit Complaint" path="/create-complaint" icon={<FaClipboardList />} color="#28a745" />
      </div>

      {!loading && recent.length > 0 && (
        <div className="card">
          <h3 className="text-primary mb-16" style={{ fontSize: "15px" }}>Recent Complaints</h3>
          {recent.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/complaint/${c.complaint_id}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
            >
              <div>
                <strong className="text-primary text-sm">{c.complaint_id}</strong>
                <span className="text-muted text-xs" style={{ marginLeft: "10px" }}>{c.category}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: STATUS_COLOR[c.status] ?? "#555" }}>
                {c.status}
              </span>
            </div>
          ))}
          {complaints.length > 5 && (
            <button onClick={() => navigate("/my-complaints")} className="btn btn-ghost text-sm mt-8" style={{ color: "#2a5298" }}>
              View all {complaints.length} complaints →
            </button>
          )}
        </div>
      )}

      <div className="card mt-16">
        <h3 className="text-primary mb-16" style={{ fontSize: "15px" }}>SLA Commitments</h3>
        {[["Critical","4 hours"],["High","24 hours"],["Medium","48 hours"],["Low","72 hours"]].map(([p, t]) => (
          <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px", color: "#555" }}>
            <span>{p}</span><strong>{t}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <Layout>
      {role === "agent"      ? <AgentDashboard      user={user} /> :
       role === "customer"   ? <CustomerDashboard   user={user} /> :
       role === "admin"      ? <AdminDashboard      user={user} /> :
       role === "supervisor" ? <SupervisorDashboard user={user} /> :
       role === "quality"    ? <QualityDashboard    user={user} /> :
                               <AdminDashboard      user={user} />}
    </Layout>
  );
}
