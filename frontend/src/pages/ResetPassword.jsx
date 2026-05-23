import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import API from "../services/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.password || !form.confirm) { setError("Both fields are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!token) { setError("Reset token is missing. Please use the link from your email."); return; }

    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/reset-password", { token, password: form.password });
      setSuccess(res.data.message);
      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}>
      <div className="card" style={{ width: "420px", padding: "40px" }}>
        <h1 className="page-title text-center" style={{ marginBottom: "10px" }}>CCRTS</h1>
        <p className="page-subtitle text-center" style={{ marginBottom: "28px" }}>Set New Password</p>

        {success ? (
          <div style={{ background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "14px 18px", fontSize: "14px" }}>
            {success} Redirecting to login…
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              className="form-input"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={form.confirm}
              onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError(""); }}
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
              {loading ? "Resetting…" : "Reset Password"}
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

export default ResetPassword;
