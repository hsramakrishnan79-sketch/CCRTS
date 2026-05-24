import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { statusClass, priorityClass } from "../utils/styleHelpers";
import { PRIORITIES, PRI_COLORS, PRI_BADGE, agentUsed, agentPct, loadColor, loadLabel, makeStripGradient } from "../utils/agentWorkloadHelpers";
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

const ALL_PRIORITIES      = ["Low", "Medium", "High", "Critical"];
const PRIORITY_TEXT_COLOR = { Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545" };

/* ── Main component ─────────────────────────────────────────────────────────── */
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
  const [workload, setWorkload]               = useState(null);
  const [ddOpen, setDdOpen]                   = useState(false);
  const [ddStyle, setDdStyle]                 = useState({});
  const statusFileRef                         = useRef(null);
  const ddContainerRef                        = useRef(null);
  const triggerRef                            = useRef(null);

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

  // Fetch workload data for the custom dropdown
  useEffect(() => {
    if (!canAssign) return;
    API.get("/workload/overview").then(r => setWorkload(r.data)).catch(() => {});
  }, [canAssign]);

  // Reset dropdown state when complaint changes
  useEffect(() => {
    setAssignAgentId("");
    setDdOpen(false);
  }, [complaint.complaint_id]);

  // Close dropdown on outside click or any scroll
  useEffect(() => {
    if (!ddOpen) return;
    const onMouse  = (e) => { if (ddContainerRef.current && !ddContainerRef.current.contains(e.target)) setDdOpen(false); };
    const onScroll = () => setDdOpen(false);
    document.addEventListener("mousedown", onMouse);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [ddOpen]);

  const handleDdToggle = () => {
    if (ddOpen) { setDdOpen(false); return; }
    if (!triggerRef.current) return;
    const rect       = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const base = {
      position: "fixed", left: `${rect.left}px`, width: `${rect.width}px`,
      zIndex: 1000, background: "white", border: "1px solid #e0e0e0",
      borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", overflowY: "auto",
    };
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      setDdStyle({ ...base, bottom: `${window.innerHeight - rect.top + 4}px`, maxHeight: `${Math.min(260, spaceAbove - 8)}px` });
    } else {
      setDdStyle({ ...base, top: `${rect.bottom + 4}px`, maxHeight: `${Math.min(260, spaceBelow - 8)}px` });
    }
    setDdOpen(true);
  };

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

  // Compute recommended agent (lightest load among eligible)
  const rec = (() => {
    if (!workload || eligible.length === 0) return null;
    let best = null, bestPct = Infinity;
    eligible.forEach(a => {
      const w = workload.agents.find(wa => wa.id === a.id);
      if (!w) return;
      const p = agentPct(w);
      if (p < bestPct) { bestPct = p; best = { agent: a, w, pct: p }; }
    });
    return best;
  })();

  // Workload data for currently selected agent
  const selectedW = assignAgentId && workload
    ? workload.agents.find(a => a.id === Number(assignAgentId))
    : null;

  return (
    <>
      {/* Backdrop */}
      <div className="side-panel-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="side-panel">

        {/* Header */}
        <div className="side-panel-header">
          <div>
            <h3 style={{ marginBottom: "8px", color: "white", fontWeight: 800, fontSize: "17px", letterSpacing: "0.3px" }}>
              {complaint.complaint_id}
            </h3>
            <div className="flex-row">
              <span className={statusClass(complaint.status)}>{complaint.status}</span>
              {complaint.priority && (
                <span className={priorityClass(complaint.priority)}>{complaint.priority}</span>
              )}
              {slaBreached && <span className="badge status-sla-breach badge-sm">⚠ SLA</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: "20px", padding: "4px 10px", color: "rgba(255,255,255,0.7)" }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="side-panel-body">

          {/* Complaint info — essential fields only */}
          <InfoRow label="Customer" value={complaint.customer_name} />
          <InfoRow label="Category" value={complaint.category} />
          <InfoRow label="Priority" value={complaint.priority} />
          {complaint.assigned_to_name && (
            <InfoRow label="Assigned To" value={complaint.assigned_to_name} />
          )}
          {!["Resolved", "Closed"].includes(complaint.status) && (
            <InfoRow
              label="SLA Deadline"
              value={complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : "Not set"}
            />
          )}

          {/* ── Attachments — only shown when files exist ── */}
          {attachments.length > 0 && (
            <div style={{ marginTop: "16px", borderTop: "1px solid #f0f0f0", paddingTop: "12px" }}>
              <p className="text-muted text-xs" style={{ marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Attachments
              </p>
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
            </div>
          )}

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

              {/* ── Assign / Reassign agent (Option D custom dropdown) ── */}
              {canAssign && ["Open", "Escalated"].includes(complaint.status) && !showOverride && (
                <div className="mb-8">
                  <label className="form-label">
                    {complaint.status === "Escalated" ? "Reassign Agent" : "Assign Agent"}{" "}
                    <span style={{ color: "#dc3545" }}>*</span>
                  </label>

                  {/* Recommendation tip */}
                  {rec && !assignAgentId && (
                    <div style={{
                      background: "#f0f7ff", border: "1px solid #bdd7f5",
                      borderRadius: "7px", padding: "8px 12px",
                      fontSize: "12px", color: "#1e3c72", marginBottom: "8px",
                    }}>
                      💡 <strong>{rec.agent.name}</strong> is recommended — lightest load ({agentUsed(rec.w)}/{rec.w.max} · {rec.pct}%)
                    </div>
                  )}

                  {/* Custom dropdown container */}
                  <div ref={ddContainerRef} style={{ marginBottom: "8px" }}>

                    {/* Trigger button */}
                    <button
                      ref={triggerRef}
                      onClick={handleDdToggle}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: "6px",
                        border: `1px solid ${ddOpen ? "#1e3c72" : "#ccc"}`,
                        background: "white", cursor: "pointer",
                        fontSize: "13px", color: assignAgentId ? "#1e3c72" : "#999",
                        fontWeight: assignAgentId ? 600 : 400,
                      }}
                    >
                      <span>
                        {assignAgentId
                          ? eligible.find(a => a.id === Number(assignAgentId))?.name ?? "Select agent"
                          : "Select agent"}
                      </span>
                      <span style={{ fontSize: "10px", color: "#888" }}>{ddOpen ? "▴" : "▾"}</span>
                    </button>

                    {/* Option list — fixed position, flips upward near bottom of viewport */}
                    {ddOpen && eligible.length > 0 && (
                      <div style={ddStyle}>
                        {eligible.map((a, idx) => {
                          const w          = workload?.agents.find(wa => wa.id === a.id);
                          const used       = w ? agentUsed(w) : null;
                          const p          = w ? agentPct(w) : null;
                          const lc         = w ? loadColor(p) : "#888";
                          const isSelected = Number(assignAgentId) === a.id;
                          const isRec      = rec?.agent.id === a.id;
                          const strip      = makeStripGradient(w);
                          const hasPri     = w && PRIORITIES.some(pr => (w.priority[pr] || 0) > 0);

                          return (
                            <div
                              key={a.id}
                              onClick={() => { setAssignAgentId(String(a.id)); setDdOpen(false); }}
                              style={{
                                position: "relative",
                                padding: "10px 12px 16px",
                                cursor: "pointer",
                                background: isSelected ? "#fce4f0" : "white",
                                borderLeft: isSelected ? "3px solid #d63384" : "3px solid transparent",
                                borderBottom: idx < eligible.length - 1 ? "1px solid #f4f4f4" : "none",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f8f0f5"; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "white"; }}
                            >
                              {/* Top row: name + rec badge + load */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e3c72" }}>{a.name}</span>
                                  {isRec && (
                                    <span style={{
                                      fontSize: "10px", fontWeight: 700, padding: "1px 6px",
                                      borderRadius: "8px", background: "#e8f4fd", color: "#1e3c72",
                                    }}>★ Recommended</span>
                                  )}
                                </div>
                                {used !== null && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, color: lc }}>
                                    {used}/{w.max}
                                  </span>
                                )}
                              </div>

                              {/* Priority badges */}
                              {hasPri ? (
                                <div style={{ display: "flex", gap: "5px", marginTop: "5px", flexWrap: "wrap" }}>
                                  {PRIORITIES.map(pr => {
                                    const n = w.priority[pr] || 0;
                                    if (!n) return null;
                                    return (
                                      <span key={pr} style={{
                                        fontSize: "10px", fontWeight: 700,
                                        padding: "1px 6px", borderRadius: "8px",
                                        ...PRI_BADGE[pr],
                                      }}>
                                        {pr[0]}: {n}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
                                  No active complaints
                                </div>
                              )}

                              {/* Bottom strip */}
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                height: "4px", background: strip,
                                borderBottomLeftRadius: idx === eligible.length - 1 ? "8px" : 0,
                                borderBottomRightRadius: idx === eligible.length - 1 ? "8px" : 0,
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {ddOpen && eligible.length === 0 && (
                      <div style={{ padding: "12px", fontSize: "13px", color: "#aaa", textAlign: "center" }}>
                        No eligible agents for this category.
                      </div>
                    )}
                  </div>

                  {/* Assign + cross-category — always right below the dropdown */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <button
                      onClick={() => setShowOverride(true)}
                      className="btn btn-ghost-danger btn-xs"
                    >
                      ↗ Cross-category override
                    </button>
                    <button onClick={handleAssign} className="btn btn-primary btn-sm">Assign</button>
                  </div>

                  {/* Hint block — shown after agent is selected */}
                  {selectedW && (() => {
                    const used  = agentUsed(selectedW);
                    const p     = agentPct(selectedW);
                    const lc    = loadColor(p);
                    const label = loadLabel(p);
                    const hint  = p >= 85
                      ? { bg: "#fff5f5", border: "#ffcdd2", color: "#7f1d1d" }
                      : p >= 70
                      ? { bg: "#fff8f0", border: "#ffd180", color: "#7d4e00" }
                      : { bg: "#f0fff4", border: "#b2dfdb", color: "#155724" };

                    return (
                      <div style={{
                        background: hint.bg, border: `1px solid ${hint.border}`,
                        borderRadius: "8px", padding: "12px", marginBottom: "10px",
                        color: hint.color,
                      }}>
                        {/* Name + label */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "13px" }}>
                            {eligible.find(a => a.id === Number(assignAgentId))?.name}
                          </span>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                            borderRadius: "8px", background: lc, color: "white",
                          }}>{label}</span>
                        </div>

                        {/* Priority-segmented bar + % */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <div style={{
                            flex: 1, background: "#f0f0f0", borderRadius: "6px",
                            height: "12px", overflow: "hidden", display: "flex",
                          }}>
                            {PRIORITIES.map(pr => {
                              const n = selectedW.priority[pr] || 0;
                              if (!n) return null;
                              return (
                                <div key={pr}
                                  title={`${pr}: ${n}`}
                                  style={{
                                    width: `${((n / selectedW.max) * 100).toFixed(1)}%`,
                                    background: PRI_COLORS[pr], height: "100%",
                                  }}
                                />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: lc, minWidth: "32px", textAlign: "right" }}>
                            {p}%
                          </span>
                        </div>

                        {/* Legend */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {PRIORITIES.map(pr => {
                              const n = selectedW.priority[pr] || 0;
                              if (!n) return null;
                              return (
                                <span key={pr} style={{ fontSize: "10px", color: "#888", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: PRI_COLORS[pr], display: "inline-block" }} />
                                  {n} {pr}
                                </span>
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "10px", color: "#888" }}>{used} / {selectedW.max} assigned</span>
                        </div>
                      </div>
                    );
                  })()}

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
