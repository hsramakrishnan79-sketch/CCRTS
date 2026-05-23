import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  "Billing Issues", "Service Disruption", "Product Defects",
  "Technical Problems", "Delivery Delays", "Account Issues",
  "Customer Service Complaints",
];

function CreateComplaint() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [formData, setFormData] = useState({ complaint_type: "", description: "" });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldError("");
  };

  const handleSubmit = async () => {
    if (!formData.complaint_type || !formData.description.trim()) {
      setFieldError("Please select a category and enter a description.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await API.post("/complaints/create", formData);
      const complaintId = response.data.complaint_id;

      if (selectedFiles.length > 0) {
        try {
          const formDataFiles = new FormData();
          for (const file of selectedFiles) formDataFiles.append("files", file);
          await API.post(`/complaints/${complaintId}/attachments`, formDataFiles, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          showToast(`Complaint ${complaintId} submitted successfully.`, "success");
        } catch {
          showToast(
            `Complaint ${complaintId} created, but file upload failed. You can upload files from the complaint details page.`,
            "warning"
          );
        }
      } else {
        showToast(`Complaint ${complaintId} submitted successfully.`, "success");
      }

      setFormData({ complaint_type: "", description: "" });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      navigate("/view-complaints");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to create complaint.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "20px 0" }}>
        <div style={{ width: "520px", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
          <div className="card-header">
            <h2>Create Complaint</h2>
            <p style={{ marginTop: "5px", opacity: 0.9 }}>Customer Complaint Resolution &amp; Tracking System</p>
          </div>

          <div className="card" style={{ borderRadius: 0, boxShadow: "none" }}>
            <select
              name="complaint_type"
              value={formData.complaint_type}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Select Category *</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <textarea
              name="description"
              placeholder="Complaint Description *"
              value={formData.description}
              onChange={handleChange}
              className="form-input"
              style={{ height: "120px", resize: "none" }}
            />

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Attachments <span className="text-muted">(optional — PDF, JPG, PNG, TXT, max 5 MB each)</span></label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                style={{ display: "block", fontSize: "13px", width: "100%" }}
              />
            </div>

            {fieldError && <div className="field-error">{fieldError}</div>}

            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-full" style={{ fontSize: "16px", padding: "14px" }}>
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreateComplaint;
