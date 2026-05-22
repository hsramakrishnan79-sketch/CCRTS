import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

const CATEGORIES = [
  "Billing Issues",
  "Service Disruption",
  "Product Defects",
  "Technical Problems",
  "Delivery Delays",
  "Account Issues",
  "Customer Service Complaints",
];

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    complaint_type: "",
    description: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const response = await API.post("/complaints/create", formData);
      alert(`${response.data.message}\nComplaint ID: ${response.data.complaint_id}`);
      setFormData({ complaint_type: "", description: "" });
      navigate("/view-complaints");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to Create Complaint");
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: "100vh", background: "#f4f6f9", display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
        <div style={{ width: "520px", background: "white", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ background: "#1e3c72", color: "white", padding: "20px", textAlign: "center" }}>
            <h2>Create Complaint</h2>
            <p style={{ marginTop: "5px", opacity: 0.9 }}>Customer Complaint Resolution &amp; Tracking System</p>
          </div>

          <div style={{ padding: "30px" }}>
            <select
              name="complaint_type"
              value={formData.complaint_type}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Category *</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <textarea
              name="description"
              placeholder="Complaint Description *"
              value={formData.description}
              onChange={handleChange}
              style={{ ...inputStyle, height: "120px", resize: "none" }}
            />

            <div style={{ background: "#fff3cd", borderRadius: "8px", padding: "12px", marginBottom: "18px", fontSize: "13px", color: "#856404" }}>
              Priority and SLA deadline will be assigned by a supervisor after review.
            </div>

            <button
              onClick={handleSubmit}
              style={{ width: "100%", padding: "14px", background: "#1e3c72", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer" }}
            >
              Submit Complaint
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "18px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "15px",
  boxSizing: "border-box",
};

export default CreateComplaint;
