import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const STATUS_STYLE = {
  "Open":                       { background: "#e2e3e5", color: "#383d41" },
  "Assigned":                   { background: "#cce5ff", color: "#004085" },
  "In Progress":                { background: "#d1ecf1", color: "#0c5460" },
  "Pending Customer Response":  { background: "#fff3cd", color: "#856404" },
  "Escalated":                  { background: "#f8d7da", color: "#721c24" },
  "Resolved":                   { background: "#d4edda", color: "#155724" },
  "Closed":                     { background: "#d6d8d9", color: "#1b1e21" },
};

const PRIORITY_COLOR = {
  Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545",
};

const ALL_STATUSES = [
  "Open", "Assigned", "In Progress", "Pending Customer Response",
  "Escalated", "Resolved", "Closed",
];

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    API.get("/complaints/my-complaints")
      .then((r) => setComplaints(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "All"
    ? complaints
    : complaints.filter((c) => c.status === statusFilter);

  const isSlaBreached = (c) =>
    c.sla_deadline &&
    !["Resolved", "Closed"].includes(c.status) &&
    new Date(c.sla_deadline) < new Date();

  return (
    <Layout>
      <h1 style={{ marginBottom: "4px", color: "#1e3c72" }}>My Complaints</h1>
      <p style={{ color: "#888", marginBottom: "24px" }}>
        All complaints you have submitted — {complaints.length} total
      </p>

      {/* Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: "#888", fontSize: "13px" }}>
          {filtered.length} complaint{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "60px", textAlign: "center", color: "#aaa", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          {complaints.length === 0
            ? "You have not submitted any complaints yet."
            : "No complaints match the selected filter."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map((c) => {
            const breached = isSlaBreached(c);
            return (
              <div
                key={c.id}
                style={{
                  background: "white", borderRadius: "12px",
                  padding: "20px 24px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                  borderLeft: `4px solid ${STATUS_STYLE[c.status]?.color ?? "#ccc"}`,
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/complaint/${c.complaint_id}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "15px", color: "#1e3c72" }}>{c.complaint_id}</strong>
                      <span style={{
                        ...STATUS_STYLE[c.status],
                        padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      }}>
                        {c.status}
                      </span>
                      {c.priority && (
                        <span style={{ color: PRIORITY_COLOR[c.priority], fontSize: "12px", fontWeight: 600 }}>
                          {c.priority}
                        </span>
                      )}
                      {breached && (
                        <span style={{ background: "#f8d7da", color: "#721c24", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                          ⚠ SLA Breached
                        </span>
                      )}
                    </div>
                    <p style={{ color: "#555", fontSize: "13px", margin: "0 0 8px" }}>{c.category}</p>
                    <p style={{ color: "#777", fontSize: "13px", margin: 0, maxWidth: "600px" }}>
                      {c.description?.length > 120 ? c.description.slice(0, 120) + "…" : c.description}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "12px", color: "#aaa", flexShrink: 0 }}>
                    <div>Submitted: {new Date(c.created_at).toLocaleDateString()}</div>
                    {c.sla_deadline && (
                      <div style={{ marginTop: "4px", color: breached ? "#dc3545" : "#888" }}>
                        SLA: {new Date(c.sla_deadline).toLocaleString()}
                      </div>
                    )}
                    {c.assigned_to_name && (
                      <div style={{ marginTop: "4px" }}>Agent: {c.assigned_to_name}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
