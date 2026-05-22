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
  const [complaints, setComplaints]       = useState([]);
  const [agentMappings, setAgentMappings] = useState([]);
  const [allAgents, setAllAgents]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [assignSelects, setAssignSelects] = useState({});

  // Override modal state
  const [overrideModal, setOverrideModal] = useState(null); // { complaint_id, category_id, category_name }
  const [overrideAgentId, setOverrideAgentId] = useState("");
  const [overrideNote, setOverrideNote]       = useState("");

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

  const fetchMappings = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        API.get("/agent-categories"),
        API.get("/users/agents"),
      ]);
      setAgentMappings(mRes.data);
      setAllAgents(aRes.data);
    } catch {
      // ignore for roles without access
    }
  };

  useEffect(() => {
    fetchEscalated();
    fetchMappings();
  }, []);

  const agentsForCategory = (category_id) =>
    agentMappings.filter((m) => m.category_id === category_id)
                 .map((m) => ({ id: m.agent_id, name: m.agent_name }));

  const handleOverrideAssign = async () => {
    if (!overrideAgentId) return alert("Select an agent");
    if (!overrideNote.trim()) return alert("A reason is required for cross-category assignment");
    try {
      await API.put(`/complaints/assign/${overrideModal.complaint_id}`, {
        assigned_to: Number(overrideAgentId),
        cross_category: true,
        note: overrideNote.trim(),
      });
      setOverrideModal(null);
      setOverrideAgentId("");
      setOverrideNote("");
      fetchEscalated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign");
    }
  };

  const handleReassign = async (complaint_id) => {
    const agentId = assignSelects[complaint_id];
    if (!agentId) return;
    try {
      await API.put(`/complaints/assign/${complaint_id}`, { assigned_to: agentId });
      fetchEscalated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reassign");
    }
  };

  const isSlaBreached = (c) =>
    c.sla_deadline && new Date(c.sla_deadline) < new Date() && !["Resolved", "Closed"].includes(c.status);

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
                {["ID", "Customer", "Category", "Priority", "Status", "SLA Deadline", "Overdue By", "Assigned To", "Reassign", ""].map((h) => (
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
                    <td style={td}>
                      {c.assigned_to_name || <span style={{ color: "#aaa" }}>Unassigned</span>}
                    </td>
                    <td style={td}>
                      {(() => {
                        const eligible = agentsForCategory(c.category_id);
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <select
                                value={assignSelects[c.complaint_id] ?? ""}
                                onChange={(e) => setAssignSelects((prev) => ({ ...prev, [c.complaint_id]: e.target.value }))}
                                style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}
                              >
                                <option value="">Select agent</option>
                                {eligible.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReassign(c.complaint_id)}
                                style={{ padding: "6px 10px", background: "#1e3c72", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                              >
                                Assign
                              </button>
                            </div>
                            <button
                              onClick={() => setOverrideModal({ complaint_id: c.complaint_id, category_id: c.category_id, category_name: c.category })}
                              style={{ fontSize: "11px", color: "#dc3545", background: "none", border: "1px dashed #dc3545", borderRadius: "5px", padding: "3px 6px", cursor: "pointer", alignSelf: "flex-start" }}
                            >
                              Override
                            </button>
                          </div>
                        );
                      })()}
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
      {/* ── Cross-category override modal ──────────────────────────────── */}
      {overrideModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", width: "460px", boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 6px", color: "#dc3545" }}>Cross-Category Assignment Override</h3>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
              Complaint <strong>{overrideModal.complaint_id}</strong> is in category <strong>{overrideModal.category_name}</strong>.
              You are assigning an agent outside this category. Both admin and supervisor are notified. A reason is mandatory.
            </p>

            <label style={labelStyle}>Select Agent (all agents)</label>
            <select
              value={overrideAgentId}
              onChange={(e) => setOverrideAgentId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select agent —</option>
              {allAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Reason for Override (mandatory)</label>
            <textarea
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Explain why this cross-category assignment is necessary..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                onClick={() => { setOverrideModal(null); setOverrideAgentId(""); setOverrideNote(""); }}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideAssign}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#dc3545", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const td = { padding: "12px 14px" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", marginBottom: "14px" };
