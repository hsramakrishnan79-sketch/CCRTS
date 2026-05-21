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

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    phone: "",
    complaint_type: "",
    description: "",
    priority: "Low",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const response = await API.post("/complaints/create", formData);
      alert(`${response.data.message}\nComplaint ID: ${response.data.complaint_id}`);
      setFormData({ customer_name: "", email: "", phone: "", complaint_type: "", description: "", priority: "Low" });
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
            <input
              type="text"
              name="customer_name"
              placeholder="Customer Name *"
              value={formData.customer_name}
              onChange={handleChange}
              style={inputStyle}
            />

            <input
              type="email"
              name="email"
              placeholder="Customer Email"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              style={inputStyle}
            />

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

            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              style={{ ...inputStyle, color: PRIORITY_COLORS[formData.priority] }}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p} Priority</option>
              ))}
            </select>

            <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px", marginBottom: "18px", fontSize: "13px", color: "#666" }}>
              SLA deadline: <strong>{SLA_LABELS[formData.priority]}</strong> after submission
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

const PRIORITY_COLORS = {
  Low: "#28a745",
  Medium: "#ffc107",
  High: "#fd7e14",
  Critical: "#dc3545",
};

const SLA_LABELS = {
  Low: "72 hours",
  Medium: "48 hours",
  High: "24 hours",
  Critical: "4 hours",
};

export default CreateComplaint;
