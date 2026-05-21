import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const PRIORITY_COLOR = { Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545" };

function timeSince(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h overdue`;
  return `${Math.floor(h / 24)}d overdue`;
}

export default function EscalationDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignInputs, setAssignInputs] = useState({});

  const fetchEscalated = async () => {
    try {
      const res = await API.get("/complaints/escalated");
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load escalated complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEscalated(); }, []);

  const handleReassign = async (complaint_id) => {
    const val = assignInputs[complaint_id]?.trim();
    if (!val) return;
    try {
      await API.put(`/complaints/assign/${complaint_id}`, { assigned_to: val });
      fetchEscalated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reassign");
    }
  };

  const isSlaBreached = (c) =>
    c.sla_deadline && new Date(c.sla_deadline) < new Date() && !["Resolved","Closed"].includes(c.status);

  return (
    <Layout>
      <h1 style={{ marginBottom: "4px", color: "#dc3545" }}>⚠ Escalation Dashboard</h1>
      <p style={{ color: "#888", marginBottom: "24px" }}>
        Escalated complaints and SLA breaches requiring immediate attention — {complaints.length} item{complaints.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : complaints.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "60px", textAlign: "center", color: "#28a745", fontSize: "18px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
          ✓ No escalated complaints. All SLAs are on track.
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#c0392b", color: "white" }}>
                {["ID","Customer","Category","Priority","Status","SLA Deadline","Overdue By","Assigned To","Reassign",""].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => {
                const breached = isSlaBreached(c);
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0", background: c.status === "Escalated" ? "#fff8f8" : "white" }}>
                    <td style={td}><strong style={{ color: "#1e3c72" }}>{c.complaint_id}</strong></td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      <div style={{ fontSize: "12px", color: "#aaa" }}>{c.email}</div>
                    </td>
                    <td style={td}>{c.category}</td>
                    <td style={{ ...td, color: PRIORITY_COLOR[c.priority], fontWeight: 700 }}>{c.priority}</td>
                    <td style={td}>
                      <span style={{ background: "#f8d7da", color: "#721c24", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ ...td, color: breached ? "#dc3545" : "#555", fontSize: "13px" }}>
                      {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—"}
                    </td>
                    <td style={{ ...td, color: "#dc3545", fontWeight: 600, fontSize: "13px" }}>
                      {breached ? timeSince(c.sla_deadline) : "—"}
                    </td>
                    <td style={td}>{c.assigned_to || <span style={{ color: "#aaa" }}>Unassigned</span>}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          placeholder="Agent name"
                          value={assignInputs[c.complaint_id] ?? ""}
                          onChange={(e) => setAssignInputs((prev) => ({ ...prev, [c.complaint_id]: e.target.value }))}
                          style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", width: "110px", fontSize: "13px" }}
                        />
                        <button
                          onClick={() => handleReassign(c.complaint_id)}
                          style={{ padding: "6px 10px", background: "#1e3c72", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => navigate(`/complaint/${c.complaint_id}`)}
                        style={{ padding: "6px 12px", background: "#6c757d", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

const td = { padding: "12px 14px" };
