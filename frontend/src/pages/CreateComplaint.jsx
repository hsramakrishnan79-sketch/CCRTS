import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";

function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    complaint_type: "",
    description: "",
    priority: "Low",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await API.post(
        "/complaints/create",
        formData
      );

      alert(
        `${response.data.message}\nComplaint ID: ${response.data.complaint_id}`
      );

      setFormData({
        customer_name: "",
        email: "",
        complaint_type: "",
        description: "",
        priority: "Low",
      });

      navigate("/view-complaints");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to Create Complaint"
      );
    }
  };

  return (
    <Layout>    
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          width: "500px",
          background: "white",
          borderRadius: "16px",
          boxShadow:
            "0 4px 15px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1e3c72",
            color: "white",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h2>Create Complaint</h2>
          <p
            style={{
              marginTop: "5px",
              opacity: 0.9,
            }}
          >
            Customer Complaint Resolution &
            Tracking System
          </p>
        </div>

        {/* Form */}
        <div
          style={{
            padding: "30px",
          }}
        >
          <input
            type="text"
            name="customer_name"
            placeholder="Customer Name"
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
            type="text"
            name="complaint_type"
            placeholder="Complaint Type"
            value={formData.complaint_type}
            onChange={handleChange}
            style={inputStyle}
          />

          <textarea
            name="description"
            placeholder="Complaint Description"
            value={formData.description}
            onChange={handleChange}
            style={{
              ...inputStyle,
              height: "120px",
              resize: "none",
            }}
          />

          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Low">
              Low Priority
            </option>
            <option value="Medium">
              Medium Priority
            </option>
            <option value="High">
              High Priority
            </option>
          </select>

          <button
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "14px",
              background: "#1e3c72",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
            }}
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
};

export default CreateComplaint;