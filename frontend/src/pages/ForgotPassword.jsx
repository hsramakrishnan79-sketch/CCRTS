import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError("Email is required."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}>
      <div className="card" style={{ width: "420px", padding: "40px" }}>
        <h1 className="page-title text-center" style={{ marginBottom: "10px" }}>CCRTS</h1>
        <p className="page-subtitle text-center" style={{ marginBottom: "28px" }}>Forgot Password</p>

        {message ? (
          <>
            <div style={{ background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", marginBottom: "20px" }}>
              {message}
            </div>
            <p className="text-center" style={{ fontSize: "13px", color: "#888" }}>
              Check the server console if SMTP is not configured.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px", lineHeight: 1.6 }}>
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="form-input"
            />

            {error && <div className="field-error">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ fontSize: "15px", padding: "13px", marginTop: "4px" }}
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </>
        )}

        <p className="text-center mt-16">
          <Link to="/">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
