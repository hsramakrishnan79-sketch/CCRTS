import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const STATUS_STYLE = {
  "Open":                       { background: "#e2e3e5", color: "#383d41" },
  "Assigned":                   { background: "#cce5ff", color: "#004085" },
  "In Progress":                { background: "#d1ecf1", color: "#0c5460" },
  "Pending Customer Response":  { background: "#fff3cd", color: "#856404" },
  "Escalated":                  { background: "#f8d7da", color: "#721c24" },
  "Resolved":                   { background: "#d4edda", color: "#155724" },
  "Closed":                     { background: "#d6d8d9", color: "#1b1e21" },
};

const PRIORITY_COLOR = {
  Low: "#28a745", Medium: "#ffc107", High: "#fd7e14", Critical: "#dc3545",
};

const BASE_URL = "http://127.0.0.1:3001";

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] || { background: "#eee", color: "#333" };
  return (
    <span style={{ ...style, padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", padding: "10px 0" }}>
      <span style={{ width: "160px", color: "#888", fontSize: "13px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: "14px" }}>{value || "—"}</span>
    </div>
  );
}

export default function ComplaintDetail() {
  const { complaint_id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [fbRating, setFbRating] = useState(5);
  const [fbComments, setFbComments] = useState("");
  const [submittingFb, setSubmittingFb] = useState(false);

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
      alert("Failed to load complaint details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [complaint_id]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await API.post(`/complaints/${complaint_id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const aRes = await API.get(`/complaints/${complaint_id}/attachments`);
      setAttachments(aRes.data);
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
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
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFb(false);
    }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", color: "#888" }}>Loading...</div></Layout>;
  }

  if (!complaint) {
    return <Layout><div style={{ padding: "40px" }}>Complaint not found.</div></Layout>;
  }

  const slaBreached =
    complaint.sla_deadline &&
    !["Resolved", "Closed"].includes(complaint.status) &&
    new Date(complaint.sla_deadline) < new Date();

  const canFeedback = ["Resolved", "Closed"].includes(complaint.status);

  return (
    <Layout>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <button
            onClick={() => navigate("/view-complaints")}
            style={{ background: "none", border: "1px solid #ccc", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", color: "#555" }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, color: "#1e3c72" }}>{complaint.complaint_id}</h2>
            <div style={{ marginTop: "6px", display: "flex", gap: "10px", alignItems: "center" }}>
              <StatusBadge status={complaint.status} />
              <span style={{ color: PRIORITY_COLOR[complaint.priority], fontWeight: 600, fontSize: "13px" }}>
                {complaint.priority} Priority
              </span>
              {slaBreached && (
                <span style={{ background: "#f8d7da", color: "#721c24", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>
                  ⚠ SLA Breached
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

          {/* ── Complaint Details ──────────────────────────────────── */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Complaint Details</h3>
            <InfoRow label="Complaint ID"   value={complaint.complaint_id} />
            <InfoRow label="Customer Name"  value={complaint.customer_name} />
            <InfoRow label="Email"          value={complaint.email} />
            <InfoRow label="Phone"          value={complaint.phone} />
            <InfoRow label="Category"       value={complaint.category} />
            <InfoRow label="Description"    value={complaint.description} />
            <InfoRow label="Assigned To"    value={complaint.assigned_to} />
            <InfoRow label="Created At"     value={complaint.created_at ? new Date(complaint.created_at).toLocaleString() : "—"} />
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
          <div style={cardStyle}>
            <h3 style={cardTitle}>Status History</h3>
            {complaint.history?.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "14px" }}>No history yet.</p>
            ) : (
              <div style={{ position: "relative", paddingLeft: "20px" }}>
                {/* vertical line */}
                <div style={{ position: "absolute", left: "7px", top: "6px", bottom: "6px", width: "2px", background: "#e0e0e0" }} />
                {complaint.history?.map((h, i) => (
                  <div key={h.id ?? i} style={{ position: "relative", marginBottom: "20px" }}>
                    {/* dot */}
                    <div style={{
                      position: "absolute", left: "-17px", top: "4px",
                      width: "12px", height: "12px", borderRadius: "50%",
                      background: STATUS_STYLE[h.new_status]?.color ?? "#888",
                      border: "2px solid white", boxShadow: "0 0 0 2px #ccc",
                    }} />
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ fontWeight: 600 }}>
                        {h.old_status ? `${h.old_status} → ` : ""}{h.new_status}
                      </span>
                      {h.changed_by_name && (
                        <span style={{ color: "#888" }}> by {h.changed_by_name}</span>
                      )}
                    </div>
                    {h.note && <div style={{ color: "#666", fontSize: "12px", marginTop: "2px" }}>{h.note}</div>}
                    <div style={{ color: "#aaa", fontSize: "11px", marginTop: "2px" }}>
                      {h.changed_at ? new Date(h.changed_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Attachments ─────────────────────────────────────────── */}
        <div style={{ ...cardStyle, marginBottom: "24px" }}>
          <h3 style={cardTitle}>Attachments</h3>

          {/* Upload */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                padding: "10px 20px", background: "#1e3c72", color: "white",
                border: "none", borderRadius: "8px", cursor: selectedFile ? "pointer" : "not-allowed",
                opacity: !selectedFile || uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginBottom: "16px" }}>
            Allowed: PDF, JPG, PNG, DOC, DOCX, TXT — max 5 MB
          </p>

          {/* File list */}
          {attachments.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "14px" }}>No attachments yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={thStyle}>File Name</th>
                  <th style={thStyle}>Uploaded By</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Download</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={tdStyle}>{a.file_name}</td>
                    <td style={tdStyle}>{a.uploaded_by_name || "—"}</td>
                    <td style={tdStyle}>{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : "—"}</td>
                    <td style={tdStyle}>
                      <a
                        href={`${BASE_URL}/uploads/${a.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1e3c72", textDecoration: "none", fontWeight: 500 }}
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Feedback ─────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Customer Feedback</h3>

          {!canFeedback ? (
            <p style={{ color: "#aaa", fontSize: "14px" }}>
              Feedback can only be submitted once the complaint is Resolved or Closed.
            </p>
          ) : feedback ? (
            <div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} style={{ fontSize: "28px", color: n <= feedback.rating ? "#ffc107" : "#ddd" }}>★</span>
                ))}
                <span style={{ alignSelf: "center", marginLeft: "8px", fontWeight: 600 }}>{feedback.rating} / 5</span>
              </div>
              {feedback.comments && <p style={{ color: "#555", fontSize: "14px" }}>{feedback.comments}</p>}
              <p style={{ color: "#aaa", fontSize: "12px" }}>
                Submitted: {feedback.submitted_at ? new Date(feedback.submitted_at).toLocaleString() : "—"}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: "12px", fontSize: "14px", color: "#555" }}>Rate your experience with the resolution:</p>

              {/* Star rating */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
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
                style={{ width: "100%", height: "90px", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", resize: "none", fontSize: "14px", boxSizing: "border-box", marginBottom: "14px" }}
              />

              <button
                onClick={handleFeedbackSubmit}
                disabled={submittingFb}
                style={{
                  padding: "10px 24px", background: "#1e3c72", color: "white",
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  opacity: submittingFb ? 0.7 : 1, fontSize: "15px",
                }}
              >
                {submittingFb ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
};

const cardTitle = {
  margin: "0 0 16px",
  color: "#1e3c72",
  fontSize: "16px",
  fontWeight: 700,
  borderBottom: "2px solid #f0f0f0",
  paddingBottom: "10px",
};

const thStyle = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#555" };
const tdStyle = { padding: "10px 12px" };
