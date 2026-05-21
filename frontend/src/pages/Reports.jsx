import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";

const PRIORITY_COLOR = { Critical: "#dc3545", High: "#fd7e14", Medium: "#ffc107", Low: "#28a745" };

// ── Reusable horizontal bar chart ────────────────────────────────────────────
function HBar({ label, count, max, color = "#1e3c72" }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      <span style={{ width: "180px", fontSize: "13px", color: "#555", flexShrink: 0, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "22px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <span style={{ width: "30px", fontWeight: 700, fontSize: "13px", color }}>{count}</span>
    </div>
  );
}

// ── Vertical bar chart (monthly trend) ──────────────────────────────────────
function VBars({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "120px" }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#555" }}>{d.count}</span>
          <div
            style={{
              width: "100%", background: "#1e3c72", borderRadius: "4px 4px 0 0",
              height: `${(d.count / max) * 90}px`, minHeight: d.count > 0 ? "4px" : "0",
            }}
          />
          <span style={{ fontSize: "10px", color: "#aaa", whiteSpace: "nowrap" }}>
            {d.month?.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Star rating display ──────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? "#ffc107" : "#ddd", fontSize: "18px" }}>★</span>
      ))}
    </span>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: "24px" }}>
      <h3 style={{ margin: "0 0 20px", color: "#1e3c72", fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/reports")
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><p style={{ color: "#888", padding: "20px" }}>Loading reports…</p></Layout>;
  if (!data)   return <Layout><p style={{ color: "#c00", padding: "20px" }}>Failed to load reports.</p></Layout>;

  const { overview, byCategory, byPriority, byMonth, agentPerformance, satisfaction } = data;
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const slaRate = overview.slaCompliance?.totalResolved > 0
    ? Math.round((overview.slaCompliance.onTime / overview.slaCompliance.totalResolved) * 100)
    : null;

  return (
    <Layout>
      <h1 style={{ marginBottom: "4px", color: "#1e3c72" }}>Reports &amp; Analytics</h1>
      <p style={{ color: "#888", marginBottom: "28px" }}>System-wide complaint analytics</p>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total Complaints",     value: overview.total,                  color: "#1e3c72" },
          { label: "Resolved",             value: overview.resolved,               color: "#28a745" },
          { label: "Resolution Rate",      value: overview.resolutionRate != null ? `${overview.resolutionRate}%` : "—", color: "#17a2b8" },
          { label: "Avg Resolution",       value: overview.avgResolutionHours != null ? `${overview.avgResolutionHours}h` : "—", color: "#6f42c1" },
          { label: "Active SLA Breaches",  value: overview.activeSlaBreaches,      color: overview.activeSlaBreaches > 0 ? "#dc3545" : "#28a745" },
          { label: "SLA On-Time Rate",     value: slaRate != null ? `${slaRate}%` : "—", color: slaRate >= 80 ? "#28a745" : "#fd7e14" },
        ].map((c) => (
          <div key={c.label} style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <h1 style={{ margin: "0 0 6px", fontSize: "30px", color: c.color }}>{c.value ?? "—"}</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

        {/* ── By Category ───────────────────────────────────────────────── */}
        <Card title="Complaints by Category">
          {byCategory.length === 0
            ? <p style={{ color: "#aaa" }}>No data yet.</p>
            : byCategory.map((c) => <HBar key={c.category} label={c.category} count={c.count} max={maxCategory} />)
          }
        </Card>

        {/* ── By Priority ───────────────────────────────────────────────── */}
        <Card title="Complaints by Priority">
          {byPriority.length === 0
            ? <p style={{ color: "#aaa" }}>No data yet.</p>
            : byPriority.map((p) => (
                <HBar key={p.priority} label={p.priority} count={p.count}
                  max={Math.max(...byPriority.map((x) => x.count), 1)}
                  color={PRIORITY_COLOR[p.priority] ?? "#6c757d"} />
              ))
          }
        </Card>
      </div>

      {/* ── Monthly Trend ────────────────────────────────────────────────── */}
      <Card title="Monthly Complaint Trend (last 6 months)">
        {byMonth.length === 0
          ? <p style={{ color: "#aaa" }}>No data in the last 6 months.</p>
          : <VBars data={byMonth} />
        }
      </Card>

      {/* ── Agent Performance ────────────────────────────────────────────── */}
      <Card title="Agent Performance">
        {agentPerformance.length === 0 ? (
          <p style={{ color: "#aaa" }}>No assigned complaints yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  {["Agent", "Total", "Resolved", "Escalated", "Resolution Rate", "Avg Time"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#555", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((a) => {
                  const rate = a.total > 0 ? Math.round((a.resolved / a.total) * 100) : 0;
                  return (
                    <tr key={a.agent} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={td}><strong>{a.agent}</strong></td>
                      <td style={td}>{a.total}</td>
                      <td style={{ ...td, color: "#28a745", fontWeight: 600 }}>{a.resolved}</td>
                      <td style={{ ...td, color: a.escalated > 0 ? "#dc3545" : "#555" }}>{a.escalated}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "80px", background: "#f0f0f0", borderRadius: "4px", height: "8px" }}>
                            <div style={{ width: `${rate}%`, background: rate >= 80 ? "#28a745" : "#fd7e14", height: "100%", borderRadius: "4px" }} />
                          </div>
                          <span style={{ fontSize: "12px" }}>{rate}%</span>
                        </div>
                      </td>
                      <td style={td}>{a.avgResolutionHours != null ? `${a.avgResolutionHours}h` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Customer Satisfaction ────────────────────────────────────────── */}
      <Card title="Customer Satisfaction">
        {satisfaction.total === 0 ? (
          <p style={{ color: "#aaa" }}>No feedback submitted yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "center" }}>
            {/* Average score */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "56px", fontWeight: 700, color: "#ffc107", lineHeight: 1 }}>
                {satisfaction.avgRating ?? "—"}
              </div>
              <Stars rating={satisfaction.avgRating ?? 0} />
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#888" }}>
                {satisfaction.total} review{satisfaction.total !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Distribution bars */}
            <div>
              {[5, 4, 3, 2, 1].map((star) => {
                const item = satisfaction.distribution.find((d) => d.rating === star);
                const cnt = item?.count ?? 0;
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ width: "20px", fontSize: "13px", color: "#888" }}>{star}★</span>
                    <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "16px" }}>
                      <div style={{
                        width: `${satisfaction.total > 0 ? (cnt / satisfaction.total) * 100 : 0}%`,
                        background: "#ffc107", height: "100%", borderRadius: "4px", transition: "width 0.4s",
                      }} />
                    </div>
                    <span style={{ width: "24px", fontSize: "12px", color: "#888" }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

    </Layout>
  );
}

const td = { padding: "10px 14px" };
