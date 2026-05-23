import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass, isSlaBreached } from "../utils/styleHelpers";
import ComplaintSidePanel from "../components/ComplaintSidePanel";
import RowActionsMenu from "../components/RowActionsMenu";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

const ALL_STATUSES   = ["Open","Assigned","In Progress","Pending Customer Response","Escalated","Resolved","Closed"];
const ALL_PRIORITIES = ["Low","Medium","High","Critical"];

function ViewComplaints() {
  const [searchParams]  = useSearchParams();
  const user            = JSON.parse(localStorage.getItem("user"));
  const showToast       = useToast();

  const [complaints, setComplaints]         = useState([]);
  const [total, setTotal]                   = useState(0);
  const [agentMappings, setAgentMappings]   = useState([]);
  const [allAgents, setAllAgents]           = useState([]);
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState(searchParams.get("filter") || "All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelReadOnly, setPanelReadOnly]         = useState(false);
  const [page, setPage]                           = useState(1);
  const [loading, setLoading]                     = useState(true);

  const debounceRef = useRef(null);

  const buildParams = (overrides = {}) => {
    const p = { page, pageSize: PAGE_SIZE };
    const s = overrides.statusFilter  ?? statusFilter;
    const pr = overrides.priorityFilter ?? priorityFilter;
    const q  = overrides.search ?? search;
    if (s  !== "All") p.status   = s;
    if (pr !== "All") p.priority = pr;
    if (q)            p.search   = q;
    if (overrides.page !== undefined) p.page = overrides.page;
    return p;
  };

  const fetchComplaints = async (params) => {
    setLoading(true);
    try {
      const res = await API.get("/complaints/all", { params });
      setComplaints(res.data.data);
      setTotal(res.data.total);
    } catch {
      showToast("Failed to load complaints.", "error");
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
      // non-admin roles won't have access — ignore
    }
  };

  useEffect(() => { fetchMappings(); }, []);

  useEffect(() => {
    fetchComplaints(buildParams());
  }, [page, statusFilter, priorityFilter]);

  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchComplaints(buildParams({ search: value, page: 1 }));
    }, 300);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePriorityChange = (value) => {
    setPriorityFilter(value);
    setPage(1);
  };

  const handleUpdate = async () => {
    const params = buildParams();
    await fetchComplaints(params);
    if (selectedComplaint) {
      try {
        const res = await API.get("/complaints/all", { params: { ...params, pageSize: 1000 } });
        const updated = res.data.data.find((c) => c.complaint_id === selectedComplaint.complaint_id);
        if (updated) setSelectedComplaint(updated);
      } catch { /* ignore */ }
    }
  };

  const deleteComplaint = async (complaintId) => {
    if (!window.confirm("Delete this complaint? This cannot be undone.")) return;
    try {
      await API.delete(`/complaints/delete/${complaintId}`);
      fetchComplaints(buildParams());
      showToast("Complaint deleted.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete.", "error");
    }
  };

  const filterLabel =
    statusFilter === "All" ? "All Complaints" :
    statusFilter === "sla" ? "SLA Breached Complaints" :
    `${statusFilter} Complaints`;

  return (
    <Layout>
      <h1 className="page-title">{filterLabel}</h1>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by ID, name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="filter-input"
          style={{ width: "260px" }}
        />
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} className="filter-select">
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="sla">SLA Breached</option>
        </select>
        <select value={priorityFilter} onChange={(e) => handlePriorityChange(e.target.value)} className="filter-select">
          <option value="All">All Priorities</option>
          {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="filter-count">
          {total} complaint{total !== 1 ? "s" : ""}
        </span>
      </div>

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
            {loading ? (
              <tr><td colSpan={8} className="text-muted text-center" style={{ padding: "40px" }}>Loading...</td></tr>
            ) : complaints.length === 0 ? (
              <tr><td colSpan={8} className="text-muted text-center" style={{ padding: "40px" }}>No complaints found.</td></tr>
            ) : (
              complaints.map((c) => {
                const breached = isSlaBreached(c);
                return (
                  <tr
                    key={c.id}
                    style={{ background: selectedComplaint?.complaint_id === c.complaint_id ? "#eef4ff" : breached ? "#fff8f8" : undefined }}
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
                        { label: "👁 View",   color: "#1e3c72", onClick: () => { setSelectedComplaint(c); setPanelReadOnly(true); } },
                        { label: "✎ Edit",   color: "#555",    onClick: () => { setSelectedComplaint(c); setPanelReadOnly(false); } },
                        ...(user?.role === "admin" ? [{ label: "🗑 Delete", color: "#dc3545", onClick: () => deleteComplaint(c.complaint_id) }] : []),
                      ]} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

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

export default ViewComplaints;
