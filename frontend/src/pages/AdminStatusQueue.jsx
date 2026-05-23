import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass, isSlaBreached } from "../utils/styleHelpers";
import ComplaintSidePanel from "../components/ComplaintSidePanel";
import RowActionsMenu from "../components/RowActionsMenu";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

// Statuses that have a valid next action — used as the server-side filter
const ACTIONABLE_STATUSES = "Assigned,In Progress,Pending Customer Response,Escalated,Resolved";

const NEXT_STATES = {
  "Assigned":                  ["Escalated"],
  "In Progress":               ["Escalated"],
  "Pending Customer Response": ["Escalated"],
  "Escalated":                 ["In Progress"],
  "Resolved":                  ["Closed"],
};

export default function AdminStatusQueue() {
  const showToast = useToast();

  const [complaints, setComplaints]               = useState([]);
  const [total, setTotal]                         = useState(0);
  const [loading, setLoading]                     = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelReadOnly, setPanelReadOnly]         = useState(false);
  const [page, setPage]                           = useState(1);

  const fetchComplaints = async (p = page) => {
    setLoading(true);
    try {
      const res = await API.get("/complaints/all", {
        params: { status: ACTIONABLE_STATUSES, page: p, pageSize: PAGE_SIZE },
      });
      setComplaints(res.data.data);
      setTotal(res.data.total);
    } catch {
      showToast("Failed to load complaints.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);
  useEffect(() => { fetchComplaints(page); }, [page]);

  const handleUpdate = async () => {
    await fetchComplaints(page);
    if (selectedComplaint) {
      try {
        const res = await API.get("/complaints/all", {
          params: { status: ACTIONABLE_STATUSES, page: 1, pageSize: 1000 },
        });
        const updated = res.data.data.find((c) => c.complaint_id === selectedComplaint.complaint_id);
        updated ? setSelectedComplaint(updated) : setSelectedComplaint(null);
      } catch { /* ignore */ }
    }
  };

  return (
    <Layout>
      <h1 className="page-title">Status Queue</h1>
      <p className="page-subtitle">
        Complaints requiring a status action — {total} pending
      </p>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : complaints.length === 0 ? (
        <div className="empty-state" style={{ color: "#28a745" }}>
          ✓ No complaints require status action.
        </div>
      ) : (
        <>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA Deadline</th>
                <th>Assigned To</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => {
                const breached = isSlaBreached(c);
                return (
                  <tr
                    key={c.id}
                    style={{
                      background: selectedComplaint?.complaint_id === c.complaint_id
                        ? "#eef4ff"
                        : breached ? "#fff8f8" : undefined,
                    }}
                  >
                    <td><strong className="text-primary">{c.complaint_id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      <div className="text-xs text-muted">{c.email}</div>
                    </td>
                    <td>{c.category}</td>
                    <td><span className={priorityClass(c.priority)}>{c.priority || "—"}</span></td>
                    <td><span className={`${statusClass(c.status)} badge-sm`}>{c.status}</span></td>
                    <td style={{ color: breached ? "#dc3545" : "#555", fontSize: "12px" }}>
                      {breached ? "⚠ " : ""}
                      {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—"}
                    </td>
                    <td className="text-sm">{c.assigned_to_name || <span className="text-muted">Unassigned</span>}</td>
                    <td style={{ textAlign: "center" }}>
                      <RowActionsMenu actions={[
                        { label: "👁 View", color: "#1e3c72", onClick: () => { setSelectedComplaint(c); setPanelReadOnly(true); } },
                        { label: "✎ Edit", color: "#555",    onClick: () => { setSelectedComplaint(c); setPanelReadOnly(false); } },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {selectedComplaint && (
        <ComplaintSidePanel
          complaint={selectedComplaint}
          agentMappings={[]}
          allAgents={[]}
          readOnly={panelReadOnly}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Layout>
  );
}
