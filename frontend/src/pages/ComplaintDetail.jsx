import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { statusClass } from "../utils/styleHelpers";
import FileViewerModal from "../components/FileViewerModal";
import InfoRow from "../components/InfoRow";

const PRIORITY_COLOR = {
  Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545",
};

const STATUS_DOT_COLOR = {
  "Open": "#383d41", "Assigned": "#004085", "In Progress": "#0c5460",
  "Pending Customer Response": "#856404", "Escalated": "#721c24",
  "Resolved": "#155724", "Closed": "#1b1e21",
};

const BASE_URL = "http://127.0.0.1:3001";

export default function ComplaintDetail() {
  const { complaint_id } = useParams();
  const navigate = useNavigate();

  const showToast = useToast();
  const [complaint, setComplaint] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [fbRating, setFbRating] = useState(5);
  const [fbComments, setFbComments] = useState("");
  const [submittingFb, setSubmittingFb] = useState(false);

  const [reopenNote, setReopenNote] = useState("");
  const [reopening, setReopening] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  const fetchAll = async () => {
    try {
      const [cRes, aRes, fRes] = await Promise.all([
        API.get(`/complaints/${complaint_id}`),
        API.get(`/complaints/${complaint_id}/attachments`),
        API.get(`/feedback/${complaint_id}`),
      ]);
      setComplaint(cRes.data);
      setAttachments(aRes.data);
      setFeedback(fRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError("You don't have permission to view this complaint.");
      } else {
        setError("Failed to load complaint details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [complaint_id]);

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of selectedFiles) formData.append("files", file);
      await API.post(`/complaints/${complaint_id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const aRes = await API.get(`/complaints/${complaint_id}/attachments`);
      setAttachments(aRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    setSubmittingFb(true);
    try {
      await API.post(`/feedback/${complaint_id}`, { rating: fbRating, comments: fbComments });
      const fRes = await API.get(`/feedback/${complaint_id}`);
      setFeedback(fRes.data);
      showToast("Feedback submitted. Thank you!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit feedback.", "error");
    } finally {
      setSubmittingFb(false);
    }
  };

  if (loading) {
    return <Layout><p className="text-muted" style={{ padding: "40px" }}>Loading...</p></Layout>;
  }

  if (error || !complaint) {
    return (
      <Layout>
        <div style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
          <h2 className="text-primary mb-8">{error ?? "Complaint not found."}</h2>
          <p className="page-subtitle mb-24">
            {error
              ? "Head back to your complaints to find what you're looking for."
              : "The complaint ID in the URL may be incorrect."}
          </p>
          <button onClick={() => window.history.back()} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const user = JSON.parse(localStorage.getItem("user"));

  const slaBreached =
    complaint.sla_deadline &&
    !["Resolved", "Closed"].includes(complaint.status) &&
    new Date(complaint.sla_deadline) < new Date();

  const canFeedback = ["Resolved", "Closed"].includes(complaint.status);

  const canReopen =
    complaint.status === "Closed" &&
    ["admin", "supervisor"].includes(user?.role);

  const handleReopen = async () => {
    if (!reopenNote.trim()) {
      showToast("Please provide a reason for reopening.", "error");
      return;
    }
    setReopening(true);
    try {
      await API.put(`/complaints/update-status/${complaint_id}`, {
        status: "Assigned",
        note: reopenNote,
      });
      setReopenNote("");
      fetchAll();
      showToast("Complaint reopened.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reopen complaint.", "error");
    } finally {
      setReopening(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex-row mb-24">
          <button onClick={() => navigate("/view-complaints")} className="btn btn-ghost">
            ← Back
          </button>
          <div>
            <h2 className="text-primary">{complaint.complaint_id}</h2>
            <div className="flex-row mt-8">
              <span className={statusClass(complaint.status)}>{complaint.status}</span>
              <span style={{ color: PRIORITY_COLOR[complaint.priority], fontWeight: 600, fontSize: "13px" }}>
                {complaint.priority} Priority
              </span>
              {slaBreached && <span className="badge status-sla-breach badge-sm">⚠ SLA Breached</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

          {/* ── Complaint Details ──────────────────────────────────── */}
          <div className="card">
            <h3 style={cardTitle}>Complaint Details</h3>
            <InfoRow label="Complaint ID"  value={complaint.complaint_id} />
            <InfoRow label="Customer Name" value={complaint.customer_name} />
            <InfoRow label="Email"         value={complaint.email} />
            <InfoRow label="Phone"         value={complaint.phone} />
            <InfoRow label="Category"      value={complaint.category} />
            <InfoRow label="Priority"      value={complaint.priority} />
            <InfoRow label="Description"   value={complaint.description} />
            <InfoRow label="Assigned To"   value={complaint.assigned_to} />
            <InfoRow label="Created At"    value={complaint.created_at ? new Date(complaint.created_at).toLocaleString() : "—"} />
            <InfoRow
              label="SLA Deadline"
              value={
                complaint.sla_deadline
                  ? `${new Date(complaint.sla_deadline).toLocaleString()}${slaBreached ? " ⚠" : ""}`
                  : "—"
              }
            />
            {complaint.resolved_at && (
              <InfoRow label="Resolved At" value={new Date(complaint.resolved_at).toLocaleString()} />
            )}
          </div>

          {/* ── Status History Timeline ────────────────────────────── */}
          <div className="card">
            <h3 style={cardTitle}>Status History</h3>
            {complaint.history?.length === 0 ? (
              <p className="text-muted">No history yet.</p>
            ) : (
              <div style={{ position: "relative", paddingLeft: "20px" }}>
                <div style={{ position: "absolute", left: "7px", top: "6px", bottom: "6px", width: "2px", background: "#e0e0e0" }} />
                {complaint.history?.map((h, i) => (
                  <div key={h.id ?? i} style={{ position: "relative", marginBottom: "20px" }}>
                    <div style={{
                      position: "absolute", left: "-17px", top: "4px",
                      width: "12px", height: "12px", borderRadius: "50%",
                      background: STATUS_DOT_COLOR[h.new_status] ?? "#888",
                      border: "2px solid white", boxShadow: "0 0 0 2px #ccc",
                    }} />
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ fontWeight: 600 }}>
                        {h.old_status ? `${h.old_status} → ` : ""}{h.new_status}
                      </span>
                      {h.changed_by_name && (
                        <span className="text-muted"> by {h.changed_by_name}</span>
                      )}
                    </div>
                    {h.note && <div className="text-sm" style={{ color: "#666", marginTop: "2px" }}>{h.note}</div>}
                    <div className="text-xs text-muted" style={{ marginTop: "2px" }}>
                      {h.changed_at ? new Date(h.changed_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Attachments ─────────────────────────────────────────── */}
        <div className="card mb-24">
          <h3 style={cardTitle}>Attachments</h3>

          {["Resolved", "Closed"].includes(complaint.status) ? (
            attachments.length === 0 ? (
              <p className="text-muted">No attachments.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.file_name}</td>
                        <td>{a.uploaded_by_name || "—"}</td>
                        <td>{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : "—"}</td>
                        <td>
                          <button
                            onClick={() => setViewingFile(a)}
                            className="btn btn-ghost btn-xs"
                            style={{ color: "#1e3c72" }}
                          >
                            👁 View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <>
              <div className="flex-row mb-16" style={{ flexWrap: "wrap" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  style={{ flex: 1, minWidth: "200px" }}
                />
                <button
                  onClick={handleUpload}
                  disabled={!selectedFiles.length || uploading}
                  className="btn btn-primary"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              <p className="text-muted text-xs mb-16">
                Allowed: PDF, JPG, PNG, TXT — max 5 MB
              </p>

              {attachments.length === 0 ? (
                <p className="text-muted">No attachments yet.</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((a) => (
                        <tr key={a.id}>
                          <td>{a.file_name}</td>
                          <td>{a.uploaded_by_name || "—"}</td>
                          <td>{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : "—"}</td>
                          <td>
                            <button
                              onClick={() => setViewingFile(a)}
                              className="btn btn-ghost btn-xs"
                              style={{ color: "#1e3c72" }}
                            >
                              👁 View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Feedback ─────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={cardTitle}>Customer Feedback</h3>

          {!canFeedback ? (
            <p className="text-muted">
              Feedback can only be submitted once the complaint is Resolved or Closed.
            </p>
          ) : feedback ? (
            <div>
              <div className="flex-row mb-8">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} style={{ fontSize: "28px", color: n <= feedback.rating ? "#ffc107" : "#ddd" }}>★</span>
                ))}
                <span style={{ alignSelf: "center", marginLeft: "8px", fontWeight: 600 }}>{feedback.rating} / 5</span>
              </div>
              {feedback.comments && <p className="text-sm" style={{ color: "#555" }}>{feedback.comments}</p>}
              <p className="text-muted text-xs">
                Submitted: {feedback.submitted_at ? new Date(feedback.submitted_at).toLocaleString() : "—"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm mb-8" style={{ color: "#555" }}>Rate your experience with the resolution:</p>
              <div className="flex-row mb-16">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => setFbRating(n)}
                    style={{ fontSize: "32px", cursor: "pointer", color: n <= fbRating ? "#ffc107" : "#ddd", transition: "color 0.15s" }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <textarea
                placeholder="Additional comments (optional)"
                value={fbComments}
                onChange={(e) => setFbComments(e.target.value)}
                className="form-input"
                style={{ height: "90px", resize: "none" }}
              />
              <button
                onClick={handleFeedbackSubmit}
                disabled={submittingFb}
                className="btn btn-primary"
              >
                {submittingFb ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>

        {/* ── Reopen ───────────────────────────────────────────────── */}
        {canReopen && (
          <div className="card mt-24" style={{ borderLeft: "4px solid #fd7e14" }}>
            <h3 style={{ ...cardTitle, color: "#fd7e14" }}>Reopen Complaint</h3>
            <p className="text-sm mb-16" style={{ color: "#555" }}>
              Reopening this complaint will return it to <strong>Assigned</strong> status.
              The assigned agent will be notified and the other management role will be informed.
              A mandatory reason is required.
            </p>
            <label className="form-label">Reason <span style={{ color: "#dc3545" }}>*</span></label>
            <textarea
              placeholder="Reason for reopening (required)"
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              className="form-input"
              style={{ height: "80px", resize: "none", borderColor: "#fd7e14" }}
            />
            <button
              onClick={handleReopen}
              disabled={reopening}
              className="btn btn-warning"
            >
              {reopening ? "Reopening..." : "Reopen Complaint"}
            </button>
          </div>
        )}

      </div>

      {viewingFile && (
        <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </Layout>
  );
}

const cardTitle = {
  margin: "0 0 16px",
  color: "#1e3c72",
  fontSize: "16px",
  fontWeight: 700,
  borderBottom: "2px solid #f0f0f0",
  paddingBottom: "10px",
};
