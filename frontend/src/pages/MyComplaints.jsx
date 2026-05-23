import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import { statusClass, priorityClass, isSlaBreached } from "../utils/styleHelpers";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

const ALL_STATUSES = [
  "Open", "Assigned", "In Progress", "Pending Customer Response",
  "Escalated", "Resolved", "Closed",
];

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage]             = useState(1);

  useEffect(() => {
    API.get("/complaints/my-complaints")
      .then((r) => setComplaints(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "All"
    ? complaints
    : complaints.filter((c) => c.status === statusFilter);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h1 className="page-title">My Complaints</h1>
      <p className="page-subtitle">
        All complaints you have submitted — {complaints.length} total
      </p>

      <div className="filters-row">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="filter-count">
          {filtered.length} complaint{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {complaints.length === 0
            ? "You have not submitted any complaints yet."
            : "No complaints match the selected filter."}
        </div>
      ) : (
        <>
        <div className="flex-col">
          {paginated.map((c) => {
            const breached = isSlaBreached(c);
            return (
              <div
                key={c.id}
                className="complaint-card"
                style={{ borderLeft: `4px solid ${breached ? "#dc3545" : "#1e3c72"}` }}
                onClick={() => navigate(`/complaint/${c.complaint_id}`)}
              >
                <div className="flex-between" style={{ flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div className="flex-row mb-8">
                      <strong className="text-primary">{c.complaint_id}</strong>
                      <span className={statusClass(c.status)}>{c.status}</span>
                      {c.priority && (
                        <span className={priorityClass(c.priority)}>{c.priority}</span>
                      )}
                      {breached && (
                        <span className="badge status-sla-breach">⚠ SLA Breached</span>
                      )}
                    </div>
                    <p className="text-muted text-sm mb-4">{c.category}</p>
                    <p style={{ color: "#777", fontSize: "13px", margin: 0, maxWidth: "600px" }}>
                      {c.description?.length > 120 ? c.description.slice(0, 120) + "…" : c.description}
                    </p>
                  </div>

                  <div className="text-right text-xs text-muted" style={{ flexShrink: 0 }}>
                    <div>Submitted: {new Date(c.created_at).toLocaleDateString()}</div>
                    {c.sla_deadline && (
                      <div className="mt-4" style={{ color: breached ? "#dc3545" : "#888" }}>
                        SLA: {new Date(c.sla_deadline).toLocaleString()}
                      </div>
                    )}
                    {c.assigned_to_name && (
                      <div className="mt-4">Agent: {c.assigned_to_name}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </Layout>
  );
}
