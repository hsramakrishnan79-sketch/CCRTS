import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const ALL_STATUSES = ["Open","Assigned","In Progress","Pending Customer Response","Escalated","Resolved","Closed"];

const STATUS_STYLE = {
  "Open":                       { background: "#e2e3e5", color: "#383d41" },
  "Assigned":                   { background: "#cce5ff", color: "#004085" },
  "In Progress":                { background: "#d1ecf1", color: "#0c5460" },
  "Pending Customer Response":  { background: "#fff3cd", color: "#856404" },
  "Escalated":                  { background: "#f8d7da", color: "#721c24" },
  "Resolved":                   { background: "#d4edda", color: "#155724" },
  "Closed":                     { background: "#d6d8d9", color: "#1b1e21" },
};

const PRIORITY_COLOR = { Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545" };

export default function AgentQueue() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Active");
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await API.get("/complaints/my-queue");
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const updateStatus = async (complaint_id, status) => {
    try {
      await API.put(`/complaints/update-status/${complaint_id}`, { status });
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const ACTIVE_STATUSES = ["Assigned", "In Progress", "Pending Customer Response", "Escalated"];

  const filtered = complaints.filter((c) => {
    if (statusFilter === "Active") return ACTIVE_STATUSES.includes(c.status);
    if (statusFilter === "All") return true;
    return c.status === statusFilter;
  });

  const slaBreached = (c) =>
    c.sla_deadline &&
    !["Resolved","Closed"].includes(c.status) &&
    new Date(c.sla_deadline) < new Date();

  return (
    <Layout>
      <h1 style={{ marginBottom: "4px", color: "#1e3c72" }}>My Work Queue</h1>
      <p style={{ color: "#888", marginBottom: "24px" }}>
        Complaints assigned to you — {complaints.length} total
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["Active", "All", ...ALL_STATUSES].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px",
              background: statusFilter === f ? "#1e3c72" : "#e9ecef",
              color: statusFilter === f ? "white" : "#555",
              fontWeight: statusFilter === f ? 700 : 400,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "60px", textAlign: "center", color: "#aaa", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          No complaints in this view.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((c) => {
            const breached = slaBreached(c);
            return (
              <div
                key={c.id}
                style={{
                  background: "white", borderRadius: "12px", padding: "20px 24px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                  borderLeft: `4px solid ${PRIORITY_COLOR[c.priority] || "#ccc"}`,
                  display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center",
                }}
              >
                {/* Left: info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "15px", color: "#1e3c72" }}>{c.complaint_id}</strong>
                    <span style={{ ...STATUS_STYLE[c.status], padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                      {c.status}
                    </span>
                    <span style={{ color: PRIORITY_COLOR[c.priority], fontSize: "12px", fontWeight: 600 }}>
                      {c.priority}
                    </span>
                    {breached && (
                      <span style={{ background: "#f8d7da", color: "#721c24", padding: "2px 8px", borderRadius: "12px", fontSize: "11px" }}>
                        ⚠ SLA Breached
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "14px", color: "#555", marginBottom: "4px" }}>
                    <strong>{c.customer_name}</strong> · {c.category}
                  </div>
                  <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>
                    {c.description?.slice(0, 120)}{c.description?.length > 120 ? "…" : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: breached ? "#dc3545" : "#aaa" }}>
                    SLA: {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—"}
                    &nbsp;·&nbsp;Created: {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "160px" }}>
                  <select
                    value={c.status}
                    onChange={(e) => updateStatus(c.complaint_id, e.target.value)}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", cursor: "pointer" }}
                  >
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => navigate(`/complaint/${c.complaint_id}`)}
                    style={{ padding: "8px", background: "#1e3c72", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
