import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import RowActionsMenu from "../components/RowActionsMenu";

const CATEGORY_COLORS = ["#1e3c72","#0c5460","#155724","#721c24","#856404","#4b0082","#1a6b3c"];

export default function AgentCategories() {
  const showToast = useToast();

  const [agents, setAgents]         = useState([]);
  const [mappings, setMappings]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [panelMode, setPanelMode]         = useState("view"); // "view" | "edit"
  const [addCategoryId, setAddCategoryId] = useState("");
  const [saving, setSaving]               = useState(false);

  const fetchAll = async () => {
    try {
      const [aRes, mRes, cRes] = await Promise.all([
        API.get("/users/agents"),
        API.get("/agent-categories"),
        API.get("/agent-categories/categories"),
      ]);
      setAgents(aRes.data);
      setMappings(mRes.data);
      setCategories(cRes.data);
    } catch {
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const agentMappings = (agentId) => mappings.filter((m) => m.agent_id === agentId);

  const unassignedCategories = (agentId) => {
    const assigned = new Set(agentMappings(agentId).map((m) => m.category_id));
    return categories.filter((c) => !assigned.has(c.id));
  };

  const handleAdd = async () => {
    if (!addCategoryId) return;
    setSaving(true);
    try {
      await API.post("/agent-categories", {
        agent_id: selectedAgent.id,
        category_id: Number(addCategoryId),
      });
      setAddCategoryId("");
      await fetchAll();
      setSelectedAgent((prev) => ({ ...prev }));
      showToast("Category assigned.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign category.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (categoryId) => {
    const mapped = agentMappings(selectedAgent.id);
    if (mapped.length === 1) {
      showToast("Cannot remove — agent must have at least one category.", "error");
      return;
    }
    setSaving(true);
    try {
      await API.delete(`/agent-categories/${selectedAgent.id}/${categoryId}`);
      await fetchAll();
      showToast("Category removed.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove category.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openPanel = (agent, mode) => {
    setSelectedAgent(agent);
    setPanelMode(mode);
    setAddCategoryId("");
  };

  return (
    <Layout>
      <h1 className="page-title">Agent Category Management</h1>
      <p className="page-subtitle">
        Assign complaint categories to agents. Every category must have at least one agent.
      </p>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="empty-state">No agents found.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned Categories</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const mapped = agentMappings(a.id);
                return (
                  <tr
                    key={a.id}
                    style={{ background: selectedAgent?.id === a.id ? "#eef4ff" : undefined }}
                  >
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td className="text-sm text-muted">{a.email}</td>
                    <td>
                      {mapped.length === 0 ? (
                        <span className="badge status-escalated badge-sm">No categories</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {mapped.map((m, i) => (
                            <span
                              key={m.category_id}
                              style={{
                                background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                color: "white", borderRadius: "12px",
                                padding: "2px 10px", fontSize: "11px", fontWeight: 600,
                              }}
                            >
                              {m.category_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <RowActionsMenu actions={[
                        { label: "👁 View", color: "#1e3c72", onClick: () => openPanel(a, "view") },
                        { label: "✎ Edit", color: "#555",    onClick: () => openPanel(a, "edit") },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Side Panel ── */}
      {selectedAgent && (
        <>
          <div className="side-panel-backdrop" onClick={() => setSelectedAgent(null)} />
          <div className="side-panel">

            <div className="side-panel-header">
              <div>
                <h3 className="text-primary" style={{ marginBottom: "4px" }}>{selectedAgent.name}</h3>
                <p className="text-muted text-sm">{selectedAgent.email}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "18px", padding: "4px 10px" }}
              >
                ×
              </button>
            </div>

            <div className="side-panel-body">
              <p
                className="text-muted text-xs"
                style={{ marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}
              >
                Assigned Categories
              </p>

              {agentMappings(selectedAgent.id).length === 0 ? (
                <p className="text-muted text-sm">No categories assigned.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                  {agentMappings(selectedAgent.id).map((m, i) => (
                    <div
                      key={m.category_id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: "8px", background: "#f4f6f9",
                        borderLeft: `4px solid ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>{m.category_name}</span>
                      {panelMode === "edit" && (
                        <button
                          onClick={() => handleRemove(m.category_id)}
                          disabled={saving}
                          className="btn btn-ghost-danger btn-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {panelMode === "edit" && (
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px" }}>
                  <p
                    className="text-muted text-xs"
                    style={{ marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}
                  >
                    Assign New Category
                  </p>
                  {unassignedCategories(selectedAgent.id).length === 0 ? (
                    <p className="text-muted text-sm">All categories are already assigned.</p>
                  ) : (
                    <div className="flex-row">
                      <select
                        value={addCategoryId}
                        onChange={(e) => setAddCategoryId(e.target.value)}
                        className="filter-select"
                        style={{ flex: 1, fontSize: "13px" }}
                      >
                        <option value="">— Select category —</option>
                        {unassignedCategories(selectedAgent.id).map((c) => (
                          <option key={c.id} value={c.id}>{c.category_name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAdd}
                        disabled={!addCategoryId || saving}
                        className="btn btn-primary btn-sm"
                      >
                        {saving ? "Saving..." : "Assign"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="side-panel-footer">
              {panelMode === "view" ? (
                <button onClick={() => setPanelMode("edit")} className="btn btn-primary btn-full">
                  Edit Categories →
                </button>
              ) : (
                <button onClick={() => setPanelMode("view")} className="btn btn-ghost btn-full">
                  Done
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
