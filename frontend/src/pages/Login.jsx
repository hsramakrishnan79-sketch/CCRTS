import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      return;
    }
    try {
      const response = await API.post("/auth/login", formData);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}>
      <div className="card" style={{ width: "400px", padding: "40px" }}>
        <h1 className="page-title text-center" style={{ marginBottom: "10px" }}>CCRTS</h1>
        <p className="page-subtitle text-center" style={{ marginBottom: "28px" }}>
          Customer Complaint Resolution &amp; Tracking System
        </p>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="form-input"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="form-input"
        />

        {error && <div className="field-error">{error}</div>}

        <button onClick={handleLogin} className="btn btn-primary btn-full" style={{ fontSize: "16px", padding: "14px" }}>
          Login
        </button>

        <p className="text-center mt-16">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
