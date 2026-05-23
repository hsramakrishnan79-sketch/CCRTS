import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import { roleBadgeClass } from "../utils/styleHelpers";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

const ROLES = ["admin", "supervisor", "agent", "customer", "quality"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "customer" };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const [fieldError, setFieldError] = useState("");
  const showToast = useToast();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setFieldError("Name, email and password are required.");
      return;
    }
    setFieldError("");
    setSubmitting(true);
    try {
      await API.post("/users", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
      showToast("User created successfully.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create user.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await API.put(`/users/${id}/role`, { role });
      fetchUsers();
      showToast("Role updated.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update role.", "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
      showToast(`User "${name}" deleted.`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete user.", "error");
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
        <div className="flex-between mb-24">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? "✕ Cancel" : "+ Add User"}
          </button>
        </div>

        {showForm && (
          <div className="card mb-24">
            <h3 className="text-primary mb-16">Create New User</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                { label: "Full Name", key: "name",     type: "text",     placeholder: "John Smith" },
                { label: "Email",     key: "email",    type: "email",    placeholder: "john@example.com" },
                { label: "Password",  key: "password", type: "password", placeholder: "Temporary password" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="form-input"
                  />
                </div>
              ))}
              <div>
                <label className="form-label">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="form-input"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {fieldError && <div className="field-error">{fieldError}</div>}
            <button onClick={handleCreate} disabled={submitting} className="btn btn-success mt-16">
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        )}

        <input
          type="text"
          placeholder="Search by name, email or role..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="form-input"
        />

        <div className="data-table-wrap">
          {loading ? (
            <p className="text-muted text-center" style={{ padding: "40px" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: "40px" }}>No users found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {["ID", "Name", "Email", "Role", "Change Role", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u) => (
                  <tr key={u.id} style={{ background: u.id === currentUser?.id ? "#f0f8ff" : undefined }}>
                    <td>{u.id}</td>
                    <td>
                      <strong>{u.name}</strong>
                      {u.id === currentUser?.id && (
                        <span className="text-muted text-xs" style={{ marginLeft: "6px" }}>(you)</span>
                      )}
                    </td>
                    <td className="text-sm" style={{ color: "#555" }}>{u.email}</td>
                    <td><span className={roleBadgeClass(u.role)}>{u.role}</span></td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span className="text-muted text-sm">Cannot change own role</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="filter-select"
                          style={{ fontSize: "13px" }}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <button onClick={() => handleDelete(u.id, u.name)} className="btn btn-danger btn-sm">
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
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </Layout>
  );
}
