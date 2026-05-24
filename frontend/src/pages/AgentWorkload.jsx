import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { PRIORITIES, PRI_COLORS, PRI_BADGE, agentUsed, agentPct, loadColor } from "../utils/agentWorkloadHelpers";

/* ── Page-specific constants ────────────────────────────────────────────────── */
const CAT_COLOR_LIST = [
  "#6f42c1", "#17a2b8", "#e83e8c",
  "#fd7e14", "#28a745", "#dc3545", "#6c757d",
];

const CAT_ABBR = {
  "Billing Issues":                "Billing",
  "Service Disruption":            "Service",
  "Product Defects":               "Products",
  "Technical Problems":            "Technical",
  "Delivery Delays":               "Delivery",
  "Account Issues":                "Account",
  "Customer Service Complaints":   "Cust. Svc",
};

/* ── Page-specific helpers ──────────────────────────────────────────────────── */
function cellStyle(n) {
  if (n === 0) return { background: "#f8f9fa", color: "#ccc" };
  if (n <= 2)  return { background: "#d4edda", color: "#155724" };
  if (n <= 4)  return { background: "#fff3cd", color: "#856404" };
  return              { background: "#f8d7da", color: "#721c24" };
}
function abbr(cat) {
  return CAT_ABBR[cat] || cat.split(" ")[0];
}

/* ── Donut SVG ──────────────────────────────────────────────────────────────── */
function Donut({ used, max, size = 40, hole = 0.58 }) {
  const r = size / 2, cx = r, cy = r;
  const p = Math.round((used / max) * 100);
  const lc = loadColor(p);
  const segs = [
    { v: used,      color: lc       },
    { v: max - used, color: "#e9ecef" },
  ];
  let angle = -Math.PI / 2;
  const paths = [];
  segs.forEach((s, i) => {
    if (s.v <= 0) return;
    const sl = (s.v / max) * 2 * Math.PI;
    const x1 = cx + r  * Math.cos(angle),      y1 = cy + r  * Math.sin(angle);
    const x2 = cx + r  * Math.cos(angle + sl), y2 = cy + r  * Math.sin(angle + sl);
    const lg = sl > Math.PI ? 1 : 0;
    const ir = r * hole;
    const ix1 = cx + ir * Math.cos(angle + sl), iy1 = cy + ir * Math.sin(angle + sl);
    const ix2 = cx + ir * Math.cos(angle),      iy2 = cy + ir * Math.sin(angle);
    paths.push(
      <path key={i}
        d={`M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${lg},0 ${ix2},${iy2} Z`}
        fill={s.color}
      />
    );
    angle += sl;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "9px", fontWeight: 800, fill: lc, fontFamily: "sans-serif" }}>
        {p}%
      </text>
    </svg>
  );
}

/* ── Segmented bar ──────────────────────────────────────────────────────────── */
function SegBar({ segments, max, height = 10 }) {
  return (
    <div style={{
      background: "#f0f0f0", borderRadius: "6px", height,
      overflow: "hidden", display: "flex",
    }}>
      {segments.map(({ key, value, color }) =>
        value > 0 ? (
          <div key={key}
            title={`${key}: ${value}`}
            style={{
              width: `${((value / max) * 100).toFixed(1)}%`,
              background: color,
              height: "100%",
            }}
          />
        ) : null
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════════════════ */
export default function AgentWorkload() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    API.get("/workload/overview")
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load workload data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "60px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>
          Loading workload data…
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center", color: "#dc3545", fontSize: "14px" }}>
          {error}
        </div>
      </Layout>
    );
  }

  const { agents, categories } = data;

  /* Build category color map */
  const catColors = {};
  categories.forEach((cat, i) => { catColors[cat] = CAT_COLOR_LIST[i % CAT_COLOR_LIST.length]; });

  /* Summary stats */
  const grandTotal = agents.reduce((s, a) => s + agentUsed(a), 0);
  const grandCap   = agents.reduce((s, a) => s + a.max, 0);
  const nearCount  = agents.filter(a => agentPct(a) >= 85).length;
  const usedPct    = grandCap > 0 ? Math.round((grandTotal / grandCap) * 100) : 0;

  /* Alerts */
  const nearFullAgents = agents.filter(a => agentPct(a) >= 85).sort((a, b) => agentPct(b) - agentPct(a));
  const lightAgents    = agents.filter(a => agentPct(a) <= 50).sort((a, b) => agentPct(a) - agentPct(b));
  const skewAlerts = [];
  categories.forEach(cat => {
    const catTotal = agents.reduce((s, a) => s + (a.categories[cat] || 0), 0);
    if (!catTotal) return;
    agents.forEach(a => {
      const share = (a.categories[cat] || 0) / catTotal;
      if (share > 0.5) skewAlerts.push({ cat, agent: a.name, pct: Math.round(share * 100) });
    });
  });

  /* Shared styles */
  const card = {
    background: "white", borderRadius: "12px", padding: "24px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: "24px",
  };
  const cardTitle = { display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #f0f0f0", paddingBottom: "12px", marginBottom: "20px" };
  const sectionLabel = { fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#bbb", marginBottom: "3px" };

  return (
    <Layout>
      <div style={{ maxWidth: "1200px" }}>

        {/* ── Page header ─────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#1e3c72", marginBottom: "2px" }}>
            Agent Workload Distribution
          </h1>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            Live complaint allocation per agent — active complaints only (excludes Resolved &amp; Closed)
          </p>
        </div>

        {/* ── Summary chips ───────────────────────────────────── */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
            { val: grandTotal, lbl: "Live Complaints",  color: "#1e3c72" },
            { val: agents.length, lbl: "Agents Active", color: "#28a745" },
            { val: grandCap,   lbl: "Total Capacity",   color: "#fd7e14" },
            { val: nearCount,  lbl: "Near Capacity",    color: "#dc3545" },
            { val: `${usedPct}%`, lbl: "Capacity Used", color: "#6f42c1" },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} style={{
              background: "white", borderRadius: "10px", padding: "16px 20px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 1, minWidth: "120px", textAlign: "center",
            }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#aaa", marginTop: "4px" }}>
                {lbl}
              </div>
            </div>
          ))}
        </div>

        {/* ── Alert banners ───────────────────────────────────── */}
        {(nearFullAgents.length > 0 || lightAgents.length > 0 || skewAlerts.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {nearFullAgents.length > 0 && (
              <div style={{ borderRadius: "8px", padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", background: "#fff5f5", border: "1px solid #ffcdd2", color: "#7f1d1d" }}>
                🔴 <strong>Near capacity:</strong>&nbsp;
                {nearFullAgents.map(a => <span key={a.id}><strong>{a.name}</strong> ({agentPct(a)}%) </span>)}
                — consider pausing new assignments.
              </div>
            )}
            {lightAgents.length > 0 && (
              <div style={{ borderRadius: "8px", padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", background: "#f0fff4", border: "1px solid #b2dfdb", color: "#155724" }}>
                🟢 <strong>Available headroom:</strong>&nbsp;
                {lightAgents.map(a => <span key={a.id}><strong>{a.name}</strong> ({agentPct(a)}%) </span>)}
                — prefer assigning new complaints here.
              </div>
            )}
            {skewAlerts.map((s, i) => (
              <div key={i} style={{ borderRadius: "8px", padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", background: "#fff3cd", border: "1px solid #ffc107", color: "#856404" }}>
                ⚠️ <strong>Skew detected:</strong> &ldquo;{s.cat}&rdquo; has {s.pct}% of complaints with <strong>{s.agent}</strong>. Consider redistributing.
              </div>
            ))}
          </div>
        )}

        {/* ── Agent Capacity Overview ──────────────────────────── */}
        <div style={card}>
          <div style={cardTitle}>
            <div style={{ width: "3px", height: "20px", background: "#1e3c72", borderRadius: "2px" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e3c72" }}>Agent Capacity Overview</h2>
            <span style={{ fontSize: "11px", color: "#bbb", marginLeft: "auto" }}>Top bar = category · Bottom bar = priority</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {agents.map(a => {
              const u = agentUsed(a), p = agentPct(a), lc = loadColor(p);
              return (
                <div key={a.id} style={{ border: "1px solid #f0f0f0", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e3c72" }}>{a.name}</div>
                    <Donut used={u} max={a.max} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px" }}>Support Agent</div>
                  <div style={sectionLabel}>By Category</div>
                  <SegBar
                    segments={categories.map(c => ({ key: c, value: a.categories[c] || 0, color: catColors[c] }))}
                    max={a.max}
                  />
                  <div style={{ ...sectionLabel, marginTop: "8px" }}>By Priority</div>
                  <SegBar
                    segments={PRIORITIES.map(p => ({ key: p, value: a.priority[p] || 0, color: PRI_COLORS[p] }))}
                    max={a.max}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginTop: "6px" }}>
                    <span style={{ fontWeight: 700, color: lc }}>{u} / {a.max} complaints</span>
                    <span style={{ fontWeight: 700, color: lc }}>{p}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px" }}>Category:</span>
            {categories.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#666" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: catColors[c], flexShrink: 0 }} />
                {c}
              </div>
            ))}
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", marginLeft: "12px" }}>Priority:</span>
            {PRIORITIES.map(p => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#666" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: PRI_COLORS[p], flexShrink: 0 }} />
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* ── Agent Assignment Overview (matrix) ──────────────── */}
        <div style={card}>
          <div style={cardTitle}>
            <div style={{ width: "3px", height: "20px", background: "#1e3c72", borderRadius: "2px" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e3c72" }}>Agent Assignment Overview</h2>
            <span style={{ fontSize: "11px", color: "#bbb", marginLeft: "auto" }}>
              Numbers · color = load level · bar = priority mix
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={thL}>Agent</th>
                  {categories.map(c => <th key={c} style={thC}>{abbr(c)}</th>)}
                  <th style={thC}>Total</th>
                  <th style={thC}>Priority Mix</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => {
                  const u = agentUsed(a), p = agentPct(a), lc = loadColor(p);
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e3c72", whiteSpace: "nowrap" }}>{a.name}</td>
                      {categories.map(c => {
                        const n = a.categories[c] || 0;
                        const cs = cellStyle(n);
                        return (
                          <td key={c} style={{ padding: "10px 14px", textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "28px", borderRadius: "6px", fontWeight: 700, fontSize: "13px", ...cs }}>
                              {n}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, fontSize: "14px", color: lc }}>{u}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
                          <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "8px", overflow: "hidden", display: "flex" }}>
                            {PRIORITIES.map(pr => {
                              const n = a.priority[pr] || 0;
                              if (!n) return null;
                              return (
                                <div key={pr}
                                  title={`${pr}: ${n}`}
                                  style={{ width: `${((n / a.max) * 100).toFixed(1)}%`, background: PRI_COLORS[pr], height: "100%" }}
                                />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "36px", textAlign: "right", color: lc }}>{p}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ background: "#f8f9fc", fontWeight: 700 }}>
                  <td style={{ padding: "10px 14px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.6px", color: "#555" }}>Total</td>
                  {categories.map(c => {
                    const t = agents.reduce((s, a) => s + (a.categories[c] || 0), 0);
                    const cs = cellStyle(t);
                    return (
                      <td key={c} style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "28px", borderRadius: "6px", fontWeight: 700, fontSize: "13px", ...cs }}>
                          {t}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, fontSize: "14px", color: "#1e3c72" }}>{grandTotal}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Agent Priority Profile ───────────────────────────── */}
        <div style={card}>
          <div style={cardTitle}>
            <div style={{ width: "3px", height: "20px", background: "#1e3c72", borderRadius: "2px" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e3c72" }}>Agent Priority Profile</h2>
            <span style={{ fontSize: "11px", color: "#bbb", marginLeft: "auto" }}>Badges + category mix bar</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={thL}>Agent</th>
                  {PRIORITIES.map(p => <th key={p} style={thC}>{p}</th>)}
                  <th style={thC}>Total</th>
                  <th style={thC}>Category Mix</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => {
                  const u = agentUsed(a), p = agentPct(a), lc = loadColor(p);
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e3c72", whiteSpace: "nowrap" }}>{a.name}</td>
                      {PRIORITIES.map(pr => (
                        <td key={pr} style={{ padding: "10px 14px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, ...PRI_BADGE[pr] }}>
                            {a.priority[pr] || 0}
                          </span>
                        </td>
                      ))}
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, color: lc }}>{u}</td>
                      <td style={{ padding: "10px 14px", minWidth: "160px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "6px", height: "8px", overflow: "hidden", display: "flex" }}>
                            {categories.map(c => {
                              const n = a.categories[c] || 0;
                              if (!n) return null;
                              return (
                                <div key={c}
                                  title={`${c}: ${n}`}
                                  style={{ width: `${((n / a.max) * 100).toFixed(1)}%`, background: catColors[c], height: "100%" }}
                                />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 700, minWidth: "28px", color: lc }}>{p}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}

/* ── Table header styles ─────────────────────────────────────────────────────── */
const thBase = {
  background: "#f8f9fc", color: "#555", fontWeight: 700, fontSize: "11px",
  textTransform: "uppercase", letterSpacing: "0.6px",
  padding: "10px 14px", borderBottom: "2px solid #e9ecef", whiteSpace: "nowrap",
};
const thL = { ...thBase, textAlign: "left" };
const thC = { ...thBase, textAlign: "center" };
