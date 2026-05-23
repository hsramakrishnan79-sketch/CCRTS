import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass } from "../utils/styleHelpers";
import FileViewerModal from "./FileViewerModal";
import InfoRow from "./InfoRow";

const ADMIN_NEXT_STATES = {
  "Open":                      [],
  "Assigned":                  ["Escalated"],
  "In Progress":               ["Escalated"],
  "Pending Customer Response": ["Escalated"],
  "Escalated":                 ["In Progress"],
  "Resolved":                  ["Closed"],
  "Closed":                    [],
};

const ALL_PRIORITIES    = ["Low", "Medium", "High", "Critical"];
const PRIORITY_TEXT_COLOR = { Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545" };


export default function ComplaintSidePanel({ complaint, agentMappings, allAgents, readOnly, onClose, onUpdate, transitions }) {
  const navigate  = useNavigate();
  const showToast = useToast();
  const userRole  = JSON.parse(localStorage.getItem("user"))?.role;
  const canAssign = ["admin", "supervisor"].includes(userRole);

  const [attachments, setAttachments]         = useState([]);
  const [feedback, setFeedback]               = useState(null);
  const [viewingFile, setViewingFile]         = useState(null);
  const [assignAgentId, setAssignAgentId]     = useState("");
  const [showOverride, setShowOverride]       = useState(false);
  const [overrideAgentId, setOverrideAgentId] = useState("");
  const [overrideNote, setOverrideNote]       = useState("");
  const [pendingStatus, setPendingStatus]     = useState("");
  const [statusNote, setStatusNote]           = useState("");
  const [statusFile, setStatusFile]           = useState(null);
  const [updatingStatus, setUpdatingStatus]   = useState(false);
  const statusFileRef                         = useRef(null);

  useEffect(() => {
    API.get(`/complaints/${complaint.complaint_id}/attachments`)
      .then((res) => setAttachments(res.data))
      .catch(() => setAttachments([]));
  }, [complaint.complaint_id]);

  useEffect(() => {
    if (complaint.status === "Resolved") {
      API.get(`/feedback/${complaint.complaint_id}`)
        .then((res) => setFeedback(res.data))
        .catch(() => setFeedback(null));
    } else {
      setFeedback(null);
    }
  }, [complaint.complaint_id, complaint.status]);

  const agentsForCategory = (category_id) =>
    agentMappings.filter((m) => m.category_id === category_id)
                 .map((m) => ({ id: m.agent_id, name: m.agent_name }));

  const updatePriority = async (priority) => {
    if (!priority) return;
    try {
      await API.put(`/complaints/priority/${complaint.complaint_id}`, { priority });
      onUpdate();
      showToast("Priority updated.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update priority.", "error");
    }
  };

  const handleAssign = async () => {
    if (!assignAgentId) { showToast("Please select an agent.", "error"); return; }
    try {
      await API.put(`/complaints/assign/${complaint.complaint_id}`, { assigned_to: Number(assignAgentId) });
      setAssignAgentId("");
      onUpdate();
      showToast("Agent assigned.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign.", "error");
    }
  };

  const handleOverrideAssign = async () => {
    if (!overrideAgentId) { showToast("Please select an agent.", "error"); return; }
    if (!overrideNote.trim()) { showToast("A reason is required.", "error"); return; }
    try {
      await API.put(`/complaints/assign/${complaint.complaint_id}`, {
        assigned_to: Number(overrideAgentId),
        cross_category: true,
        note: overrideNote.trim(),
      });
      setShowOverride(false);
      setOverrideAgentId("");
      setOverrideNote("");
      onUpdate();
      showToast("Cross-category assignment saved.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign.", "error");
    }
  };

  const submitStatusUpdate = async () => {
    if (!statusNote.trim()) { showToast("A comment is required.", "error"); return; }
    setUpdatingStatus(true);
    try {
      await API.put(`/complaints/update-status/${complaint.complaint_id}`, {
        status: pendingStatus,
        note: statusNote.trim(),
      });
      if (statusFile) {
        const formData = new FormData();
        formData.append("files", statusFile);
        await API.post(`/complaints/${complaint.complaint_id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setPendingStatus("");
      setStatusNote("");
      setStatusFile(null);
      if (statusFileRef.current) statusFileRef.current.value = "";
      onUpdate();
      showToast("Status updated.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const eligible            = agentsForCategory(complaint.category_id);
  const eligibleIds         = new Set(eligible.map((a) => a.id));
  const crossCategoryAgents = allAgents.filter((a) => !eligibleIds.has(a.id));
  const rawNextStates       = (transitions ?? ADMIN_NEXT_STATES)[complaint.status] ?? [];
  const nextStates          = userRole === "agent" && complaint.status === "Resolved" && (!feedback || feedback.rating < 3)
    ? rawNextStates.filter((s) => s !== "Closed")
    : rawNextStates;
  const slaBreached =
    complaint.sla_deadline &&
    !["Resolved", "Closed"].includes(complaint.status) &&
    new Date(complaint.sla_deadline) < new Date();

  return (
    <>
      {/* Backdrop */}
      <div className="side-panel-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="side-panel">

        {/* Header */}
        <div className="side-panel-header">
          <div>
            <h3 className="text-primary" style={{ marginBottom: "6px" }}>{complaint.complaint_id}</h3>
            <div className="flex-row">
              <span className={statusClass(complaint.status)}>{complaint.status}</span>
              {complaint.priority && (
                <span className={priorityClass(complaint.priority)}>{complaint.priority}</span>
              )}
              {slaBreached && <span className="badge status-sla-breach badge-sm">⚠ SLA</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: "18px", padding: "4px 10px" }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="side-panel-body">

          {/* Complaint info */}
          <InfoRow label="Customer"    value={complaint.customer_name} />
          <InfoRow label="Email"       value={complaint.email} />
          <InfoRow label="Category"    value={complaint.category} />
          <InfoRow label="Priority"    value={complaint.priority} />
          <InfoRow label="Assigned To" value={complaint.assigned_to_name} />
          <InfoRow label="Created"     value={complaint.created_at ? new Date(complaint.created_at).toLocaleString() : null} />
          <InfoRow
            label="SLA Deadline"
            value={complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : null}
          />
          {complaint.description && (
            <div style={{ marginTop: "12px" }}>
              <p className="text-muted text-xs" style={{ marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Description</p>
              <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{complaint.description}</p>
            </div>
          )}

          {/* ── Attachments ──────────────────────────── */}
          <div style={{ marginTop: "16px", borderTop: "1px solid #f0f0f0", paddingTop: "12px" }}>
            <p className="text-muted text-xs" style={{ marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Attachments
            </p>
            {attachments.length === 0 ? (
              <p className="text-muted text-xs">No attached files.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {attachments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setViewingFile(a)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "6px 10px", borderRadius: "6px",
                      background: "#f4f6f9", border: "1px solid #e0e0e0",
                      fontSize: "12px", color: "#1e3c72", fontWeight: 500,
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    📎 {a.file_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Actions ─────────────────────────────── */}
          {!readOnly && (complaint.status === "Open" || nextStates.length > 0) && (
            <div style={{ marginTop: "20px", borderTop: "2px solid #f0f0f0", paddingTop: "16px" }}>
              <p className="text-muted text-xs" style={{ marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>
                Actions
              </p>

              {/* Priority (Open complaints only) */}
              {complaint.status === "Open" && (
                <div className="mb-16">
                  <label className="form-label">Set Priority</label>
                  <select
                    value={complaint.priority ?? ""}
                    onChange={(e) => updatePriority(e.target.value)}
                    className="form-input"
                    style={{ color: PRIORITY_TEXT_COLOR[complaint.priority] ?? "#999" }}
                  >
                    <option value="">— Select priority —</option>
                    {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {/* Assign / Reassign agent (admin and supervisor only) */}
              {canAssign && ["Open", "Escalated"].includes(complaint.status) && !showOverride && (
                <div className="mb-8">
                  <label className="form-label">
                    {complaint.status === "Escalated" ? "Reassign Agent" : "Assign Agent"}{" "}
                    <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <div className="flex-row mb-8">
                    <select
                      value={assignAgentId}
                      onChange={(e) => setAssignAgentId(e.target.value)}
                      className="filter-select"
                      style={{ flex: 1, fontSize: "13px" }}
                    >
                      <option value="">Select agent</option>
                      {eligible.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={handleAssign} className="btn btn-primary btn-sm">Assign</button>
                  </div>
                  <button
                    onClick={() => setShowOverride(true)}
                    className="btn btn-ghost-danger btn-xs"
                  >
                    ↗ Cross-category override
                  </button>
                </div>
              )}

              {/* Override form */}
              {canAssign && ["Open", "Escalated"].includes(complaint.status) && showOverride && (
                <div className="mb-16" style={{ background: "#fff8f8", borderRadius: "8px", padding: "14px", border: "1px dashed #dc3545" }}>
                  <p className="text-sm mb-8" style={{ color: "#721c24" }}>
                    Cross-category assignment — reason is mandatory.
                  </p>
                  <label className="form-label">Agent (other categories) <span style={{ color: "#dc3545" }}>*</span></label>
                  {crossCategoryAgents.length === 0 ? (
                    <p className="text-muted text-xs mb-8">No agents available outside this category.</p>
                  ) : (
                    <select value={overrideAgentId} onChange={(e) => setOverrideAgentId(e.target.value)} className="form-input">
                      <option value="">— Select agent —</option>
                      {crossCategoryAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                  <label className="form-label">Reason <span style={{ color: "#dc3545" }}>*</span></label>
                  <textarea
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    placeholder="Why is cross-category assignment necessary?"
                    className="form-input"
                    style={{ height: "70px", resize: "none" }}
                  />
                  <div className="flex-row" style={{ justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowOverride(false); setOverrideAgentId(""); setOverrideNote(""); }} className="btn btn-ghost btn-sm">
                      Cancel
                    </button>
                    <button onClick={handleOverrideAssign} className="btn btn-danger btn-sm">
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Status update (two-step: pick status → note + file) */}
              {nextStates.length > 0 && (
                <div>
                  <label className="form-label">Update Status</label>
                  <select
                    value={pendingStatus}
                    onChange={(e) => { setPendingStatus(e.target.value); setStatusNote(""); setStatusFile(null); }}
                    className="form-input"
                  >
                    <option value="">— Select new status —</option>
                    {nextStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  {pendingStatus && (
                    <div style={{ background: "#f4f6f9", borderRadius: "8px", padding: "12px", border: "1px solid #ddd", marginTop: "-8px" }}>
                      <label className="form-label">
                        Comment <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <textarea
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Reason for this status change (required)"
                        className="form-input"
                        style={{ height: "70px", resize: "none" }}
                      />
                      <label className="form-label">Attach File <span className="text-muted">(optional)</span></label>
                      <input
                        ref={statusFileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.txt"
                        onChange={(e) => setStatusFile(e.target.files[0] || null)}
                        style={{ fontSize: "12px", marginBottom: "12px", display: "block" }}
                      />
                      <div className="flex-row" style={{ justifyContent: "flex-end" }}>
                        <button
                          onClick={() => { setPendingStatus(""); setStatusNote(""); setStatusFile(null); }}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitStatusUpdate}
                          disabled={!statusNote.trim() || updatingStatus}
                          className="btn btn-primary btn-sm"
                        >
                          {updatingStatus ? "Saving..." : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="side-panel-footer">
          <button
            onClick={() => navigate(`/complaint/${complaint.complaint_id}`)}
            className="btn btn-primary btn-full"
          >
            View Full Details →
          </button>
        </div>
      </div>

      {viewingFile && (
        <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </>
  );
}
