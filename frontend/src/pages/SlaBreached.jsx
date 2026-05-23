import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass } from "../utils/styleHelpers";
import ComplaintSidePanel from "../components/ComplaintSidePanel";
import RowActionsMenu from "../components/RowActionsMenu";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

function overdueBy(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h overdue`;
  return `${Math.floor(h / 24)}d overdue`;
}

export default function SlaBreached() {
  const showToast = useToast();

  const [complaints, setComplaints]               = useState([]);
  const [agentMappings, setAgentMappings]         = useState([]);
  const [allAgents, setAllAgents]                 = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelReadOnly, setPanelReadOnly]         = useState(false);
  const [page, setPage]                           = useState(1);

  const fetchAll = async () => {
    try {
      const [cRes, mRes, aRes] = await Promise.all([
        API.get("/complaints/sla-breached"),
        API.get("/agent-categories"),
        API.get("/users/agents"),
      ]);
      setComplaints(cRes.data);
      setAgentMappings(mRes.data);
      setAllAgents(aRes.data);
    } catch {
      showToast("Failed to load SLA breached complaints.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpdate = async () => {
    try {
      const res = await API.get("/complaints/sla-breached");
      setComplaints(res.data);
      if (selectedComplaint) {
        const updated = res.data.find((c) => c.complaint_id === selectedComplaint.complaint_id);
        updated ? setSelectedComplaint(updated) : setSelectedComplaint(null);
      }
    } catch {
      showToast("Failed to refresh.", "error");
    }
  };

  return (
    <Layout>
      <h1 className="page-title" style={{ color: "#dc3545" }}>⏱ SLA Breached</h1>
      <p className="page-subtitle">
        Complaints past their SLA deadline — {complaints.length} item{complaints.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : complaints.length === 0 ? (
        <div className="empty-state" style={{ color: "#28a745" }}>
          ✓ No SLA breaches. All active complaints are within deadline.
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
                <th>Overdue By</th>
                <th>Assigned To</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {complaints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => (
                <tr
                  key={c.id}
                  style={{
                    background: selectedComplaint?.complaint_id === c.complaint_id ? "#eef4ff" : "#fff8f8",
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
                  <td style={{ color: "#dc3545", fontSize: "12px" }}>
                    ⚠ {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—"}
                  </td>
                  <td style={{ color: "#dc3545", fontWeight: 600, fontSize: "12px" }}>
                    {overdueBy(c.sla_deadline)}
                  </td>
                  <td className="text-sm">{c.assigned_to_name || <span className="text-muted">Unassigned</span>}</td>
                  <td style={{ textAlign: "center" }}>
                    <RowActionsMenu actions={[
                      { label: "👁 View", color: "#1e3c72", onClick: () => { setSelectedComplaint(c); setPanelReadOnly(true); } },
                      { label: "✎ Edit", color: "#555",    onClick: () => { setSelectedComplaint(c); setPanelReadOnly(false); } },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={complaints.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {selectedComplaint && (
        <ComplaintSidePanel
          complaint={selectedComplaint}
          agentMappings={agentMappings}
          allAgents={allAgents}
          readOnly={panelReadOnly}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Layout>
  );
}
