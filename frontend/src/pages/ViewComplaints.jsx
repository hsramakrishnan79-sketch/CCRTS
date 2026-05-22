import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const ALL_STATUSES = [
  "Open", "Assigned", "In Progress", "Pending Customer Response",
  "Escalated", "Resolved", "Closed",
];

// Valid next states by role. Resolved is excluded for admin/supervisor — only the
// assigned agent can mark a complaint Resolved (backend enforces this too).
const NEXT_STATES = {
  admin: {
    "Open":                      [],
    "Assigned":                  ["In Progress", "Pending Customer Response", "Escalated"],
    "In Progress":               ["Pending Customer Response", "Escalated"],
    "Pending Customer Response": ["In Progress", "Escalated"],
    "Escalated":                 ["In Progress"],
    "Resolved":                  ["Closed"],
    "Closed":                    [],
  },
  supervisor: {
    "Open":                      [],
    "Assigned":                  ["In Progress", "Pending Customer Response", "Escalated"],
    "In Progress":               ["Pending Customer Response", "Escalated"],
    "Pending Customer Response": ["In Progress", "Escalated"],
    "Escalated":                 ["In Progress"],
    "Resolved":                  ["Closed"],
    "Closed":                    [],
  },
  agent: {
    "Open":                      [],
    "Assigned":                  ["In Progress", "Pending Customer Response", "Escalated", "Resolved"],
    "In Progress":               ["Pending Customer Response", "Escalated", "Resolved"],
    "Pending Customer Response": ["In Progress", "Escalated", "Resolved"],
    "Escalated":                 ["In Progress", "Resolved"],
    "Resolved":                  [],
    "Closed":                    [],
  },
};

const ALL_PRIORITIES = ["Low", "Medium", "High", "Critical"];

const STATUS_STYLE = {
  "Open":                       { background: "#e2e3e5", color: "#383d41" },
  "Assigned":                   { background: "#cce5ff", color: "#004085" },
  "In Progress":                { background: "#d1ecf1", color: "#0c5460" },
  "Pending Customer Response":  { background: "#fff3cd", color: "#856404" },
  "Escalated":                  { background: "#f8d7da", color: "#721c24" },
  "Resolved":                   { background: "#d4edda", color: "#155724" },
  "Closed":                     { background: "#d6d8d9", color: "#1b1e21" },
};

const PRIORITY_STYLE = {
  Low:      { color: "#28a745" },
  Medium:   { color: "#ffc107" },
  High:     { color: "#fd7e14" },
  Critical: { color: "#dc3545", fontWeight: "bold" },
};

function ViewComplaints() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const canSetPriority = ["admin", "supervisor"].includes(user?.role);

  const [complaints, setComplaints]       = useState([]);
  const [agentMappings, setAgentMappings] = useState([]);
  const [allAgents, setAllAgents]         = useState([]);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Override modal state
  const [overrideModal, setOverrideModal] = useState(null); // { complaint_id, category_id, category_name }
  const [overrideAgentId, setOverrideAgentId] = useState("");
  const [overrideNote, setOverrideNote]       = useState("");

  const fetchComplaints = async () => {
    try {
      const response = await API.get("/complaints/all");
      setComplaints(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load complaints");
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
      // non-admin/supervisor roles won't have access — ignore silently
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchMappings();
  }, []);

  // Returns agents mapped to a given category_id
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
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign");
    }
  };

  const updateStatus = async (complaintId, status) => {
    try {
      await API.put(`/complaints/update-status/${complaintId}`, { status });
      fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status");
    }
  };

  const updatePriority = async (complaintId, priority) => {
    if (!priority) return;
    try {
      await API.put(`/complaints/priority/${complaintId}`, { priority });
      fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update priority");
    }
  };

  const assignAgent = async (complaintId, agentId) => {
    if (!agentId) return;
    try {
      await API.put(`/complaints/assign/${complaintId}`, { assigned_to: agentId });
      fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to assign agent");
    }
  };

  const deleteComplaint = async (complaintId) => {
    if (!window.confirm("Delete this complaint? This cannot be undone.")) return;
    try {
      await API.delete(`/complaints/delete/${complaintId}`);
      fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete complaint");
    }
  };

  const isSlaBreached = (complaint) => {
    if (!complaint.sla_deadline) return false;
    if (["Resolved", "Closed"].includes(complaint.status)) return false;
    return new Date(complaint.sla_deadline) < new Date();
  };

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.complaint_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <Layout>
      <div style={{ padding: "40px", background: "#f4f6f9", minHeight: "100vh" }}>
        <h1 style={{ marginBottom: "20px", color: "#1e3c72" }}>Complaint Management</h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "25px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by ID, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "12px", width: "280px", borderRadius: "8px", border: "1px solid #ddd" }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}
          >
            <option value="All">All Priorities</option>
            {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <span style={{ padding: "12px", color: "#666", alignSelf: "center" }}>
            {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1e3c72", color: "white" }}>
                <th style={thStyle}>Complaint ID</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>SLA Deadline</th>
                <th style={thStyle}>Assigned To</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                    No complaints found
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((complaint) => {
                  const breached = isSlaBreached(complaint);
                  return (
                    <tr
                      key={complaint.id}
                      style={{ borderBottom: "1px solid #eee", background: breached ? "#fff8f8" : "white" }}
                    >
                      <td style={tdStyle}>
                        <strong>{complaint.complaint_id}</strong>
                      </td>

                      <td style={tdStyle}>
                        <div>{complaint.customer_name}</div>
                        <div style={{ fontSize: "12px", color: "#999" }}>{complaint.email}</div>
                      </td>

                      <td style={tdStyle}>{complaint.category}</td>

                      <td style={tdStyle}>
                        {canSetPriority ? (
                          <select
                            value={complaint.priority ?? ""}
                            onChange={(e) => updatePriority(complaint.complaint_id, e.target.value)}
                            style={{
                              padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd",
                              fontSize: "13px", cursor: "pointer",
                              color: PRIORITY_STYLE[complaint.priority]?.color ?? "#999",
                              fontWeight: complaint.priority === "Critical" ? "bold" : "normal",
                            }}
                          >
                            <option value="">— Set Priority —</option>
                            {ALL_PRIORITIES.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={PRIORITY_STYLE[complaint.priority]}>
                            {complaint.priority || "—"}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <span style={{
                          ...STATUS_STYLE[complaint.status],
                          display: "inline-block", padding: "3px 10px",
                          borderRadius: "12px", fontSize: "12px", fontWeight: 600, marginBottom: "6px",
                        }}>
                          {complaint.status}
                        </span>
                        {(() => {
                          const nextStates = (NEXT_STATES[user?.role] ?? {})[complaint.status] ?? [];
                          if (!nextStates.length) return null;
                          return (
                            <select
                              value=""
                              onChange={(e) => { if (e.target.value) updateStatus(complaint.complaint_id, e.target.value); }}
                              style={{ display: "block", padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", cursor: "pointer", width: "100%" }}
                            >
                              <option value="" disabled>Move to →</option>
                              {nextStates.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          );
                        })()}
                      </td>

                      <td style={tdStyle}>
                        {complaint.sla_deadline ? (
                          <span style={{ color: breached ? "#dc3545" : "#28a745", fontSize: "13px" }}>
                            {breached ? "⚠ " : ""}
                            {new Date(complaint.sla_deadline).toLocaleString()}
                          </span>
                        ) : "—"}
                      </td>

                      <td style={tdStyle}>
                        {canSetPriority ? (() => {
                          const eligible = agentsForCategory(complaint.category_id);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <select
                                value={complaint.assigned_to ?? ""}
                                onChange={(e) => assignAgent(complaint.complaint_id, e.target.value)}
                                style={{ padding: "7px", borderRadius: "6px", border: "1px solid #ddd", width: "150px", fontSize: "13px" }}
                              >
                                <option value="">— Unassigned —</option>
                                {eligible.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setOverrideModal({
                                  complaint_id: complaint.complaint_id,
                                  category_id: complaint.category_id,
                                  category_name: complaint.category,
                                })}
                                style={{ fontSize: "11px", color: "#dc3545", background: "none", border: "1px dashed #dc3545", borderRadius: "5px", padding: "3px 6px", cursor: "pointer" }}
                              >
                                Override
                              </button>
                            </div>
                          );
                        })() : (
                          <span style={{ color: "#666", fontSize: "13px" }}>
                            {complaint.assigned_to_name || "Unassigned"}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => navigate(`/complaint/${complaint.complaint_id}`)}
                            style={{ background: "#1e3c72", color: "white", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteComplaint(complaint.complaint_id)}
                            style={{ background: "#dc3545", color: "white", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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
              placeholder="Explain why this cross-category assignment is necessary (e.g., category agent overloaded, specialist unavailable)..."
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

const thStyle = { padding: "14px 16px", textAlign: "left", fontWeight: 600 };
const tdStyle = { padding: "14px 16px" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", marginBottom: "14px" };

export default ViewComplaints;
