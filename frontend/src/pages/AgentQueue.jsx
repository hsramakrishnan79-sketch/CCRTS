import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass, isSlaBreached } from "../utils/styleHelpers";
import ComplaintSidePanel from "../components/ComplaintSidePanel";
import RowActionsMenu from "../components/RowActionsMenu";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

const ALL_STATUSES = ["Open","Assigned","In Progress","Pending Customer Response","Escalated","Resolved","Closed"];
const ACTIVE_STATUSES = ["Assigned", "In Progress", "Pending Customer Response", "Escalated"];

const AGENT_NEXT_STATES = {
  "Open":                      [],
  "Assigned":                  ["In Progress", "Pending Customer Response", "Escalated", "Resolved"],
  "In Progress":               ["Pending Customer Response", "Escalated", "Resolved"],
  "Pending Customer Response": ["In Progress", "Escalated", "Resolved"],
  "Escalated":                 [],
  "Resolved":                  ["Closed"],
  "Closed":                    [],
};

const PRIORITY_BORDER = { Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545" };

export default function AgentQueue() {
  const showToast = useToast();

  const [complaints, setComplaints]               = useState([]);
  const [statusFilter, setStatusFilter]           = useState("Active");
  const [loading, setLoading]                     = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelReadOnly, setPanelReadOnly]         = useState(false);
  const [page, setPage]                           = useState(1);

  const fetchQueue = async () => {
    try {
      const res = await API.get("/complaints/my-queue");
      setComplaints(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load queue.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleUpdate = async () => {
    try {
      const res = await API.get("/complaints/my-queue");
      setComplaints(res.data);
      if (selectedComplaint) {
        const updated = res.data.find((c) => c.complaint_id === selectedComplaint.complaint_id);
        updated ? setSelectedComplaint(updated) : setSelectedComplaint(null);
      }
    } catch {
      showToast("Failed to refresh.", "error");
    }
  };

  const filtered = complaints.filter((c) => {
    if (statusFilter === "Active") return ACTIVE_STATUSES.includes(c.status);
    if (statusFilter === "All") return true;
    return c.status === statusFilter;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h1 className="page-title">My Work Queue</h1>
      <p className="page-subtitle">Complaints assigned to you — {complaints.length} total</p>

      <div className="filters-row">
        {["Active", "All", ...ALL_STATUSES].map((f) => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPage(1); }}
            style={{
              padding: "7px 14px", borderRadius: "20px", border: "none", fontSize: "12px",
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
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No complaints in this view.</div>
      ) : (
        <>
        <div className="flex-col">
          {paginated.map((c) => {
            const breached = isSlaBreached(c);
            return (
              <div
                key={c.id}
                className="complaint-card"
                style={{
                  borderLeft: `4px solid ${PRIORITY_BORDER[c.priority] || "#ccc"}`,
                  display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center",
                  background: selectedComplaint?.complaint_id === c.complaint_id ? "#eef4ff" : undefined,
                }}
              >
                {/* Left: info */}
                <div>
                  <div className="flex-row mb-8">
                    <strong className="text-primary" style={{ fontSize: "15px" }}>{c.complaint_id}</strong>
                    <span className={statusClass(c.status)}>{c.status}</span>
                    <span className={priorityClass(c.priority)}>{c.priority}</span>
                    {breached && <span className="badge status-sla-breach badge-sm">⚠ SLA Breached</span>}
                  </div>
                  <div className="text-sm mb-4" style={{ color: "#555" }}>
                    <strong>{c.customer_name}</strong> · {c.category}
                  </div>
                  <div className="text-muted text-sm mb-8">
                    {c.description?.slice(0, 120)}{c.description?.length > 120 ? "…" : ""}
                  </div>
                  <div className="text-xs" style={{ color: breached ? "#dc3545" : "#aaa" }}>
                    SLA: {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—"}
                    &nbsp;·&nbsp;Created: {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                  </div>
                </div>

                {/* Right: actions menu */}
                <RowActionsMenu actions={[
                  { label: "👁 View", color: "#1e3c72", onClick: () => { setSelectedComplaint(c); setPanelReadOnly(true); } },
                  { label: "✎ Edit", color: "#555",    onClick: () => { setSelectedComplaint(c); setPanelReadOnly(false); } },
                ]} />
              </div>
            );
          })}
        </div>
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {selectedComplaint && (
        <ComplaintSidePanel
          complaint={selectedComplaint}
          agentMappings={[]}
          allAgents={[]}
          transitions={AGENT_NEXT_STATES}
          readOnly={panelReadOnly}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Layout>
  );
}
