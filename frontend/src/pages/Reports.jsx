import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import StarRating from "../components/StarRating";
import { HBar, VBars } from "../components/ChartBars";
import ChartWithHighlights from "../components/ChartWithHighlights";
import { PRIORITY_COLOR, SCORE_COLOR } from "../utils/styleHelpers";
import {
  FaClipboardList, FaCheckCircle, FaClock, FaExclamationTriangle, FaShieldAlt,
  FaChartBar, FaUsers, FaStar, FaCheckDouble,
} from "react-icons/fa";
import EmptyState from "../components/EmptyState";

const THIS_YEAR  = new Date().getFullYear();
const THIS_MONTH = `${THIS_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
const YEARS      = Array.from({ length: 5 }, (_, i) => THIS_YEAR - i);

const TABS = [
  { key: "overview",     label: "Overview",              roles: ["admin", "supervisor", "quality"] },
  { key: "agents",       label: "Agents",                roles: ["admin", "supervisor", "quality"] },
  { key: "sla",          label: "SLA & Resolution",      roles: ["admin", "supervisor", "quality"] },
  { key: "satisfaction", label: "Satisfaction",          roles: ["admin", "quality"] },
  { key: "cross",        label: "Cross-Assignments",     roles: ["admin", "quality"] },
];

export default function Reports() {
  const userRole = JSON.parse(localStorage.getItem("user"))?.role;
  const isAdmin  = userRole === "admin";

  const [activeTab, setActiveTab] = useState("overview");

  // ── Filter state (admin only) ─────────────────────────────────────────────
  const [mode, setMode]       = useState("all");
  const [month, setMonth]     = useState(THIS_MONTH);
  const [year, setYear]       = useState(String(THIS_YEAR));
  const [quarter, setQuarter] = useState("Q1");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (isAdmin && mode !== "all") {
      params.set("mode", mode);
      if (mode === "monthly")   params.set("month", month);
      if (mode === "quarterly") { params.set("year", year); params.set("quarter", quarter); }
      if (mode === "yearly")    params.set("year", year);
      if (mode === "custom")    { params.set("from", from); params.set("to", to); }
    }
    const qs = params.toString();
    try {
      const r = await API.get(`/reports${qs ? `?${qs}` : ""}`);
      setData(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleApply = () => {
    if (mode === "custom" && (!from || !to)) return;
    fetchReports();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await API.post("/reports/refresh");
      await fetchReports();
    } catch {
      alert("ETL refresh failed. Check server logs.");
    } finally {
      setRefreshing(false);
    }
  };

  const periodLabel = () => {
    if (!isAdmin || mode === "all") return "All Time";
    if (mode === "monthly")   return `Month: ${month}`;
    if (mode === "quarterly") return `${quarter} ${year}`;
    if (mode === "yearly")    return `Year: ${year}`;
    if (mode === "custom" && from && to) return `${from} to ${to}`;
    return "";
  };

  if (loading) return <Layout><p className="text-muted" style={{ padding: "20px" }}>Loading reports…</p></Layout>;
  if (!data)   return <Layout><p className="text-danger" style={{ padding: "20px" }}>Failed to load reports.</p></Layout>;

  const { overview, byCategory, byPriority, byMonth, trendGroup, agentPerformance,
          slaSummary, resolutionTrends, satisfaction, crossAssignments } = data;

  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);
  const slaCompliancePct = overview.slaCompliance?.totalResolved > 0
    ? Math.round((overview.slaCompliance.onTime / overview.slaCompliance.totalResolved) * 100)
    : null;
  const trendLabelKey = trendGroup === "day" ? "day" : "month";
  const trendTitle =
    trendGroup === "day"  ? `Daily Complaint Trend — ${month}` :
    mode === "quarterly"  ? `Monthly Trend — ${quarter} ${year}` :
    mode === "yearly"     ? `Monthly Trend — ${year}` :
    mode === "custom"     ? `Complaint Trend — ${from} to ${to}` :
                            "Monthly Complaint Trend — Last 12 Months";

  return (
    <Layout>
      <h1 className="page-title">Reports &amp; Analytics</h1>
      <p className="page-subtitle">System-wide complaint analytics — {periodLabel()}</p>

      {/* ── Period filter (admin only) ──────────────────────────────────────── */}
      {isAdmin && (
        <div className="card mb-24" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { value: "all",       label: "All Time" },
                { value: "monthly",   label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly",    label: "Yearly" },
                { value: "custom",    label: "Custom Period" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  style={{
                    padding: "6px 14px", borderRadius: "20px", border: "none",
                    fontSize: "13px", cursor: "pointer",
                    background: mode === opt.value ? "#1e3c72" : "#e9ecef",
                    color: mode === opt.value ? "white" : "#555",
                    fontWeight: mode === opt.value ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {mode === "monthly" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Month</label>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="filter-select" style={{ fontSize: "13px" }} />
              </div>
            )}
            {mode === "quarterly" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Quarter</label>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="filter-select" style={{ fontSize: "13px" }}>
                  {["Q1","Q2","Q3","Q4"].map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
                <label className="form-label" style={{ margin: 0 }}>Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="filter-select" style={{ fontSize: "13px" }}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {mode === "yearly" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="filter-select" style={{ fontSize: "13px" }}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {mode === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="filter-select" style={{ fontSize: "13px" }} />
                <label className="form-label" style={{ margin: 0 }}>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="filter-select" style={{ fontSize: "13px" }} />
              </div>
            )}

            {mode !== "all" && (
              <button onClick={handleApply} disabled={mode === "custom" && (!from || !to)} className="btn btn-primary btn-sm">
                Apply
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-sm"
              style={{ marginLeft: "auto", background: "#e9ecef", color: "#555", border: "none" }}
            >
              {refreshing ? "Refreshing…" : "Refresh Analytics"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "inline-flex", gap: "4px", background: "#eef0f5", borderRadius: "12px",
        padding: "4px", marginBottom: "24px",
      }}>
        {TABS.filter((t) => t.roles.includes(userRole)).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px", border: "none", cursor: "pointer", fontSize: "13px",
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#1e3c72" : "#777",
              background: activeTab === tab.key ? "white" : "transparent",
              borderRadius: "8px",
              boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <StatCard
              label="Total Complaints"
              value={overview.total}
              icon={<FaClipboardList size={28} />}
              gradient="linear-gradient(135deg,#1e3c72,#2a5298)"
            />
            <StatCard
              label="Resolved"
              value={overview.resolved}
              sub={`${overview.resolutionRate}% rate`}
              icon={<FaCheckCircle size={28} />}
              gradient="linear-gradient(135deg,#56ab2f,#a8e063)"
            />
            <StatCard
              label="Avg Resolution"
              value={overview.avgResolutionHours != null ? `${overview.avgResolutionHours}h` : "—"}
              sub="per complaint"
              icon={<FaClock size={28} />}
              gradient="linear-gradient(135deg,#834d9b,#d04ed6)"
            />
            <StatCard
              label="SLA Compliance"
              value={slaCompliancePct != null ? `${slaCompliancePct}%` : "—"}
              sub={`${overview.slaCompliance?.onTime ?? 0} of ${overview.slaCompliance?.totalResolved ?? 0}`}
              icon={<FaShieldAlt size={28} />}
              gradient={
                slaCompliancePct >= 80 ? "linear-gradient(135deg,#56ab2f,#a8e063)" :
                slaCompliancePct >= 60 ? "linear-gradient(135deg,#f7971e,#ffd200)" :
                                         "linear-gradient(135deg,#cb2d3e,#ef473a)"
              }
              light={slaCompliancePct >= 60 && slaCompliancePct < 80}
            />
            <StatCard
              label="Active Breaches"
              value={overview.activeSlaBreaches}
              sub="unresolved past SLA"
              icon={<FaExclamationTriangle size={28} />}
              gradient={
                overview.activeSlaBreaches > 0
                  ? "linear-gradient(135deg,#cb2d3e,#ef473a)"
                  : "linear-gradient(135deg,#56ab2f,#a8e063)"
              }
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <SectionCard title="Complaints by Category">
              {byCategory.length === 0
                ? <EmptyState icon={<FaChartBar />} message="No category data yet." />
                : byCategory.map((c) => <HBar key={c.category} label={c.category} count={c.count} max={maxCategory} />)
              }
            </SectionCard>

            <SectionCard title="Complaints by Priority">
              {byPriority.length === 0
                ? <EmptyState icon={<FaChartBar />} message="No priority data yet." />
                : byPriority.map((p) => (
                    <HBar key={p.priority} label={p.priority} count={p.count}
                      max={Math.max(...byPriority.map((x) => x.count), 1)}
                      color={PRIORITY_COLOR[p.priority] ?? "#6c757d"} />
                  ))
              }
            </SectionCard>
          </div>

          <SectionCard title={trendTitle}>
            {byMonth.length === 0
              ? <EmptyState icon={<FaChartBar />} message="No data for this period." />
              : <ChartWithHighlights data={byMonth} keyX={trendLabelKey} keyY="count" color="#1e3c72" height={180} />
            }
          </SectionCard>
        </>
      )}

      {/* ── Agents tab ──────────────────────────────────────────────────────── */}
      {activeTab === "agents" && (
        <SectionCard title="Agent Performance">
          {agentPerformance.length === 0 ? (
            <EmptyState icon={<FaUsers />} message="No agent data yet." hint='Click "Refresh Analytics" to populate.' />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {["Agent", "Total Handled", "Avg Rating", "SLA Compliance", "Reopened", "Score"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a) => (
                    <tr key={a.agent}>
                      <td><strong>{a.agent}</strong></td>
                      <td>{a.total}</td>
                      <td>
                        {a.avgRating != null
                          ? <span style={{ color: "#ffc107", fontWeight: 600 }}>{"★".repeat(Math.round(a.avgRating))} <span style={{ color: "#555" }}>({a.avgRating})</span></span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>
                        {a.slaCompliance != null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "70px", background: "#f0f0f0", borderRadius: "4px", height: "8px" }}>
                              <div style={{ width: `${a.slaCompliance}%`, background: a.slaCompliance >= 80 ? "#28a745" : "#fd7e14", height: "100%", borderRadius: "4px" }} />
                            </div>
                            <span className="text-xs">{a.slaCompliance}%</span>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td style={{ color: a.reopened > 0 ? "#dc3545" : "#555" }}>{a.reopened}</td>
                      <td>
                        <span style={{
                          display: "inline-block", minWidth: "42px", textAlign: "center",
                          padding: "2px 10px", borderRadius: "12px", fontSize: "13px", fontWeight: 700,
                          background: SCORE_COLOR(a.score) + "22", color: SCORE_COLOR(a.score),
                        }}>
                          {a.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── SLA & Resolution tab ────────────────────────────────────────────── */}
      {activeTab === "sla" && (
        <>
          <SectionCard title="SLA Compliance Analysis">
            {(!slaSummary || (slaSummary.byCategory.length === 0 && slaSummary.byPriority.length === 0)) ? (
              <EmptyState icon={<FaShieldAlt />} message="No SLA data yet." hint='Click "Refresh Analytics" to populate.' />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#999", marginBottom: "12px" }}>By Category</p>
                  {slaSummary.byCategory.map((c) => (
                    <div key={c.category} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ color: "#555" }}>{c.category}</span>
                        <span style={{ fontWeight: 700, color: c.complianceRate >= 80 ? "#28a745" : c.complianceRate >= 60 ? "#fd7e14" : "#dc3545" }}>
                          {c.complianceRate}%
                        </span>
                      </div>
                      <div style={{ background: "#f0f0f0", borderRadius: "4px", height: "10px" }}>
                        <div style={{
                          width: `${c.complianceRate}%`, height: "100%", borderRadius: "4px", transition: "width 0.4s",
                          background: c.complianceRate >= 80 ? "#28a745" : c.complianceRate >= 60 ? "#fd7e14" : "#dc3545",
                        }} />
                      </div>
                      <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "11px", color: "#aaa" }}>
                        <span>{c.compliant} on-time</span>
                        <span style={{ color: c.breached > 0 ? "#dc3545" : "#aaa" }}>{c.breached} breached</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#999", marginBottom: "12px" }}>By Priority</p>
                  {slaSummary.byPriority.map((p) => (
                    <div key={p.priority} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: PRIORITY_COLOR[p.priority] ?? "#555" }}>{p.priority}</span>
                        <span style={{ fontWeight: 700, color: p.complianceRate >= 80 ? "#28a745" : p.complianceRate >= 60 ? "#fd7e14" : "#dc3545" }}>
                          {p.complianceRate}%
                        </span>
                      </div>
                      <div style={{ background: "#f0f0f0", borderRadius: "4px", height: "10px" }}>
                        <div style={{
                          width: `${p.complianceRate}%`, height: "100%", borderRadius: "4px", transition: "width 0.4s",
                          background: p.complianceRate >= 80 ? "#28a745" : p.complianceRate >= 60 ? "#fd7e14" : "#dc3545",
                        }} />
                      </div>
                      <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "11px", color: "#aaa" }}>
                        <span>{p.compliant} on-time of {p.total}</span>
                        <span style={{ color: p.breached > 0 ? "#dc3545" : "#aaa" }}>{p.breached} breached</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Resolution Time by Priority">
            {(!resolutionTrends || resolutionTrends.byPriority.length === 0) ? (
              <EmptyState icon={<FaClock />} message="No resolution data yet." hint='Click "Refresh Analytics" to populate.' />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#999", marginBottom: "12px" }}>Average Resolution Hours</p>
                  {(() => {
                    const maxHours = Math.max(...resolutionTrends.byPriority.map((p) => p.avgHours), 1);
                    return resolutionTrends.byPriority.map((p) => (
                      <div key={p.priority} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ width: "70px", fontSize: "13px", fontWeight: 600, color: PRIORITY_COLOR[p.priority] ?? "#555", flexShrink: 0 }}>
                            {p.priority}
                          </span>
                          <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                            <div style={{
                              width: `${(p.avgHours / maxHours) * 100}%`, height: "100%", borderRadius: "4px",
                              background: PRIORITY_COLOR[p.priority] ?? "#1e3c72", transition: "width 0.4s",
                            }} />
                          </div>
                          <span style={{ width: "50px", fontSize: "13px", fontWeight: 700, color: "#555" }}>{p.avgHours}h</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#aaa", marginLeft: "80px", marginTop: "2px" }}>
                          min {p.minHours}h — max {p.maxHours}h ({p.total} resolved)
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#999", marginBottom: "12px" }}>Trend by Period</p>
                  {resolutionTrends.byPeriod.length === 0 ? (
                    <EmptyState icon={<FaChartBar />} message="No period data." />
                  ) : (
                    <div className="data-table-wrap" style={{ maxHeight: "220px", overflowY: "auto" }}>
                      <table className="data-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Period</th><th>Priority</th><th>Avg Hours</th><th>Resolved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resolutionTrends.byPeriod.map((r, i) => (
                            <tr key={i}>
                              <td>{r.period}</td>
                              <td style={{ fontWeight: 600, color: PRIORITY_COLOR[r.priority] ?? "#555" }}>{r.priority}</td>
                              <td>{r.avgHours}h</td>
                              <td>{r.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ── Satisfaction tab ─────────────────────────────────────────────────── */}
      {activeTab === "satisfaction" && (
        <SectionCard title="Customer Satisfaction">
          {satisfaction.total === 0 ? (
            <EmptyState icon={<FaStar />} message="No feedback submitted yet." hint="Feedback appears once customers rate resolved complaints." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "center" }}>
              <div className="text-center">
                <div style={{ fontSize: "56px", fontWeight: 700, color: "#ffc107", lineHeight: 1 }}>
                  {satisfaction.avgRating ?? "—"}
                </div>
                <StarRating rating={satisfaction.avgRating ?? 0} />
                <p className="text-muted text-sm mt-8">
                  {satisfaction.total} review{satisfaction.total !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                {[5, 4, 3, 2, 1].map((star) => {
                  const item = satisfaction.distribution.find((d) => d.rating === star);
                  const cnt = item?.count ?? 0;
                  return (
                    <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span className="text-muted text-sm" style={{ width: "20px" }}>{star}★</span>
                      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "16px" }}>
                        <div style={{
                          width: `${satisfaction.total > 0 ? (cnt / satisfaction.total) * 100 : 0}%`,
                          background: "#ffc107", height: "100%", borderRadius: "4px", transition: "width 0.4s",
                        }} />
                      </div>
                      <span className="text-muted text-xs" style={{ width: "24px" }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Cross-Assignments tab ────────────────────────────────────────────── */}
      {activeTab === "cross" && (
        <SectionCard title="Cross-Category Assignment Overrides">
          {!crossAssignments || crossAssignments.total === 0 ? (
            <EmptyState icon={<FaCheckDouble />} message="No cross-category assignments recorded." success />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                <div>
                  <p className="text-muted text-sm" style={{ fontWeight: 600, marginBottom: "10px" }}>By Overloaded Category</p>
                  {crossAssignments.byCategory.map((c) => (
                    <HBar key={c.category} label={c.category} count={c.count}
                      max={Math.max(...crossAssignments.byCategory.map((x) => x.count), 1)}
                      color="#fd7e14" />
                  ))}
                </div>
                <div>
                  <p className="text-muted text-sm" style={{ fontWeight: 600, marginBottom: "10px" }}>By Cross-Assigned Agent</p>
                  {crossAssignments.byAgent.map((a) => (
                    <HBar key={a.agent} label={a.agent} count={a.count}
                      max={Math.max(...crossAssignments.byAgent.map((x) => x.count), 1)}
                      color="#6f42c1" />
                  ))}
                </div>
              </div>

              <p className="text-muted text-sm mb-8" style={{ fontWeight: 600 }}>Recent Override Log</p>
              <div className="data-table-wrap">
                <table className="data-table" style={{ fontSize: "13px" }}>
                  <thead>
                    <tr>
                      {["Date", "Complaint", "Category", "Agent", "Assigned By", "Reason"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crossAssignments.recent.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.assigned_at).toLocaleDateString()}</td>
                        <td className="text-primary">{r.complaint_id}</td>
                        <td>{r.complaint_category}</td>
                        <td>{r.agent}</td>
                        <td>{r.assigned_by}</td>
                        <td style={{ color: "#555", maxWidth: "220px" }}>{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      )}
    </Layout>
  );
}
