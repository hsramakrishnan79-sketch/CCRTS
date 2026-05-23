import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { priorityClass } from "../utils/styleHelpers";
import ComplaintSidePanel from "../components/ComplaintSidePanel";
import RowActionsMenu from "../components/RowActionsMenu";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

export default function AdminAssignmentQueue() {
  const showToast = useToast();

  const [complaints, setComplaints]       = useState([]);
  const [total, setTotal]                 = useState(0);
  const [agentMappings, setAgentMappings] = useState([]);
  const [allAgents, setAllAgents]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelReadOnly, setPanelReadOnly]         = useState(false);
  const [page, setPage]                           = useState(1);

  const fetchComplaints = async (p = page) => {
    setLoading(true);
    try {
      const res = await API.get("/complaints/all", {
        params: { status: "Open", page: p, pageSize: PAGE_SIZE },
      });
      setComplaints(res.data.data);
      setTotal(res.data.total);
    } catch {
      showToast("Failed to load data.", "error");
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
      showToast("Failed to load agent data.", "error");
    }
  };

  useEffect(() => { fetchComplaints(); fetchMappings(); }, []);
  useEffect(() => { fetchComplaints(page); }, [page]);

  const handleUpdate = async () => {
    await fetchComplaints(page);
    if (selectedComplaint) {
      try {
        const res = await API.get("/complaints/all", {
          params: { status: "Open", page: 1, pageSize: 1000 },
        });
        const updated = res.data.data.find((c) => c.complaint_id === selectedComplaint.complaint_id);
        updated ? setSelectedComplaint(updated) : setSelectedComplaint(null);
      } catch { /* ignore */ }
    }
  };

  return (
    <Layout>
      <h1 className="page-title">Assignment Queue</h1>
      <p className="page-subtitle">
        Open complaints awaiting agent assignment — {total} pending
      </p>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : complaints.length === 0 ? (
        <div className="empty-state" style={{ color: "#28a745" }}>
          ✓ All complaints have been assigned.
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
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  style={{ background: selectedComplaint?.complaint_id === c.complaint_id ? "#eef4ff" : undefined }}
                >
                  <td><strong className="text-primary">{c.complaint_id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                    <div className="text-xs text-muted">{c.email}</div>
                  </td>
                  <td>{c.category}</td>
                  <td><span className={priorityClass(c.priority)}>{c.priority || "—"}</span></td>
                  <td style={{ fontSize: "12px", color: "#555" }}>
                    {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                  </td>
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
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
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
