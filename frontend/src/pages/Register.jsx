import { useState } from "react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

function Register() {
  const showToast = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "customer" });
  const [fieldError, setFieldError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldError("");
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setFieldError("Name, email and password are required.");
      return;
    }
    try {
      const response = await API.post("/auth/register", formData);
      showToast(response.data.message, "success");
      setFormData({ name: "", email: "", password: "", role: "customer" });
    } catch (error) {
      showToast(error.response?.data?.message || "Registration failed.", "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}>
      <div className="card" style={{ width: "380px" }}>
        <h2 className="page-title mb-16">Register User</h2>

        <input
          type="text" name="name" placeholder="Full Name"
          value={formData.name} onChange={handleChange}
          className="form-input"
        />
        <input
          type="email" name="email" placeholder="Email"
          value={formData.email} onChange={handleChange}
          className="form-input"
        />
        <input
          type="password" name="password" placeholder="Password"
          value={formData.password} onChange={handleChange}
          className="form-input"
        />
        <select name="role" value={formData.role} onChange={handleChange} className="form-input">
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="customer">Customer</option>
        </select>

        {fieldError && <div className="field-error">{fieldError}</div>}

        <button onClick={handleRegister} className="btn btn-success btn-full">
          Register
        </button>
      </div>
    </div>
  );
}

export default Register;
