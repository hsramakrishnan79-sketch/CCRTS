import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const ALL_STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Pending Customer Response",
  "Escalated",
  "Resolved",
  "Closed",
];

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
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const fetchComplaints = async () => {
    try {
      const response = await API.get("/complaints/all");
      setComplaints(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load complaints");
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const updateStatus = async (complaintId, status) => {
    try {
      await API.put(`/complaints/update-status/${complaintId}`, { status });
      fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status");
    }
  };

  const assignAgent = async (complaintId, assignedTo) => {
    if (!assignedTo.trim()) return;
    try {
      await API.put(`/complaints/assign/${complaintId}`, { assigned_to: assignedTo });
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
                      style={{
                        borderBottom: "1px solid #eee",
                        background: breached ? "#fff8f8" : "white",
                      }}
                    >
                      <td style={tdStyle}>
                        <strong>{complaint.complaint_id}</strong>
                      </td>

                      <td style={tdStyle}>
                        <div>{complaint.customer_name}</div>
                        <div style={{ fontSize: "12px", color: "#999" }}>{complaint.email}</div>
                      </td>

                      <td style={tdStyle}>{complaint.category}</td>

                      <td style={{ ...tdStyle, ...PRIORITY_STYLE[complaint.priority] }}>
                        {complaint.priority}
                      </td>

                      <td style={tdStyle}>
                        <select
                          value={complaint.status}
                          onChange={(e) => updateStatus(complaint.complaint_id, e.target.value)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "13px",
                            ...(STATUS_STYLE[complaint.status] || {}),
                          }}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
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
                        <input
                          type="text"
                          placeholder="Assign agent..."
                          defaultValue={complaint.assigned_to || ""}
                          onBlur={(e) => assignAgent(complaint.complaint_id, e.target.value)}
                          style={{ padding: "7px", borderRadius: "6px", border: "1px solid #ddd", width: "130px" }}
                        />
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
    </Layout>
  );
}

const thStyle = { padding: "14px 16px", textAlign: "left", fontWeight: 600 };
const tdStyle = { padding: "14px 16px" };

export default ViewComplaints;
