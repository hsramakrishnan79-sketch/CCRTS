import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { FaUserCog, FaPlus, FaTimes } from "react-icons/fa";

export default function AgentCategories() {
  const [mappings, setMappings]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents]         = useState([]);
  const [addSelects, setAddSelects] = useState({});
  const [error, setError]           = useState("");

  const fetchAll = async () => {
    try {
      const [mRes, cRes, aRes] = await Promise.all([
        API.get("/agent-categories"),
        API.get("/agent-categories/categories"),
        API.get("/users/agents"),
      ]);
      setMappings(mRes.data);
      setCategories(cRes.data);
      setAgents(aRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const agentsByCategory = (category_id) =>
    mappings.filter((m) => m.category_id === category_id);

  const unmappedAgents = (category_id) => {
    const mapped = new Set(agentsByCategory(category_id).map((m) => m.agent_id));
    return agents.filter((a) => !mapped.has(a.id));
  };

  const handleAdd = async (category_id) => {
    const agent_id = addSelects[category_id];
    if (!agent_id) return;
    try {
      await API.post("/agent-categories", { agent_id: Number(agent_id), category_id });
      setAddSelects((prev) => ({ ...prev, [category_id]: "" }));
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add mapping");
    }
  };

  const handleRemove = async (agent_id, category_id) => {
    try {
      await API.delete(`/agent-categories/${agent_id}/${category_id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove mapping");
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "960px" }}>
        <h1 style={{ marginBottom: "4px", color: "#1e3c72" }}>Agent Category Management</h1>
        <p style={{ color: "#888", marginBottom: "28px" }}>
          Assign agents to complaint categories. Every category must have at least one agent at all times.
        </p>

        {error && (
          <div style={{ background: "#f8d7da", color: "#721c24", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "20px" }}>
          {categories.map((cat) => {
            const mapped   = agentsByCategory(cat.id);
            const options  = unmappedAgents(cat.id);
            const isLast   = mapped.length === 1;

            return (
              <div key={cat.id} style={{
                background: "white", borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)", padding: "20px",
                borderLeft: `4px solid ${mapped.length === 0 ? "#dc3545" : "#1e3c72"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <FaUserCog color="#1e3c72" size={18} />
                  <h3 style={{ margin: 0, color: "#1e3c72", fontSize: "15px" }}>{cat.category_name}</h3>
                  <span style={{
                    marginLeft: "auto", fontSize: "12px", fontWeight: 600,
                    background: mapped.length === 0 ? "#f8d7da" : "#d4edda",
                    color: mapped.length === 0 ? "#721c24" : "#155724",
                    padding: "2px 10px", borderRadius: "12px",
                  }}>
                    {mapped.length} agent{mapped.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Assigned agents */}
                {mapped.length === 0 ? (
                  <p style={{ color: "#dc3545", fontSize: "13px", margin: "0 0 12px" }}>
                    No agents assigned — this category cannot accept complaints.
                  </p>
                ) : (
                  <div style={{ marginBottom: "14px" }}>
                    {mapped.map((m) => (
                      <div key={m.agent_id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", background: "#f8f9fa", borderRadius: "8px",
                        marginBottom: "6px",
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: "14px" }}>{m.agent_name}</span>
                          <span style={{ color: "#999", fontSize: "12px", marginLeft: "8px" }}>{m.agent_email}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(m.agent_id, cat.id)}
                          title={isLast ? "Cannot remove last agent" : "Remove"}
                          disabled={isLast}
                          style={{
                            background: isLast ? "#e9ecef" : "#f8d7da",
                            color: isLast ? "#aaa" : "#721c24",
                            border: "none", borderRadius: "6px",
                            padding: "5px 10px", cursor: isLast ? "not-allowed" : "pointer",
                            fontSize: "13px", display: "flex", alignItems: "center", gap: "4px",
                          }}
                        >
                          <FaTimes size={11} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add agent */}
                {options.length > 0 ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={addSelects[cat.id] ?? ""}
                      onChange={(e) => setAddSelects((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
                    >
                      <option value="">— Add agent —</option>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAdd(cat.id)}
                      style={{
                        background: "#1e3c72", color: "white", border: "none",
                        borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                        fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      <FaPlus size={11} /> Add
                    </button>
                  </div>
                ) : (
                  <p style={{ color: "#28a745", fontSize: "13px", margin: 0 }}>
                    All agents are assigned to this category.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
