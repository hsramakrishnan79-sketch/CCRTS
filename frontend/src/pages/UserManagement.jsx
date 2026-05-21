import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";

const ROLES = ["admin", "supervisor", "agent", "customer", "quality"];

const ROLE_BADGE = {
  admin:      { background: "#6f42c1", color: "white" },
  supervisor: { background: "#fd7e14", color: "white" },
  agent:      { background: "#1e3c72", color: "white" },
  customer:   { background: "#28a745", color: "white" },
  quality:    { background: "#17a2b8", color: "white" },
};

const EMPTY_FORM = { name: "", email: "", password: "", role: "customer" };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      return alert("Name, email and password are required");
    }
    setSubmitting(true);
    try {
      await API.post("/users", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await API.put(`/users/${id}/role`, { role });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ marginBottom: "4px", color: "#1e3c72" }}>User Management</h1>
            <p style={{ color: "#888" }}>{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: "10px 20px", background: "#1e3c72", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            {showForm ? "✕ Cancel" : "+ Add User"}
          </button>
        </div>

        {/* Create user form */}
        {showForm && (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "20px", color: "#1e3c72" }}>Create New User</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                { label: "Full Name", key: "name",     type: "text",     placeholder: "John Smith" },
                { label: "Email",     key: "email",    type: "email",    placeholder: "john@example.com" },
                { label: "Password",  key: "password", type: "password", placeholder: "Temporary password" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "5px" }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "5px" }}>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={submitting}
              style={{ marginTop: "20px", padding: "11px 24px", background: "#28a745", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, email or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}
        />

        {/* Table */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: "40px", textAlign: "center", color: "#aaa" }}>No users found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e3c72", color: "white" }}>
                  {["ID", "Name", "Email", "Role", "Change Role", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0", background: u.id === currentUser?.id ? "#f0f8ff" : "white" }}>
                    <td style={td}>{u.id}</td>
                    <td style={td}>
                      <strong>{u.name}</strong>
                      {u.id === currentUser?.id && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#888" }}>(you)</span>}
                    </td>
                    <td style={{ ...td, color: "#555", fontSize: "13px" }}>{u.email}</td>
                    <td style={td}>
                      <span style={{ ...ROLE_BADGE[u.role], padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={td}>
                      {u.id === currentUser?.id ? (
                        <span style={{ color: "#aaa", fontSize: "13px" }}>Cannot change own role</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", cursor: "pointer" }}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={td}>
                      {u.id === currentUser?.id ? (
                        <span style={{ color: "#aaa", fontSize: "13px" }}>—</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          style={{ padding: "6px 14px", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const td = { padding: "12px 16px" };
