const db = require("../config/db");

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

// GET /api/workload/overview — agent workload summary (admin/supervisor)
const getWorkloadOverview = (req, res) => {
  try {
    const agents = db.prepare(`
      SELECT u.id, u.name, COALESCE(s.max_capacity, 10) AS max
      FROM users u
      JOIN roles r ON r.id = u.role_id AND r.role_name = 'agent'
      LEFT JOIN agent_settings s ON s.agent_id = u.id
      ORDER BY u.name ASC
    `).all();

    const categories = db.prepare(
      `SELECT id, category_name FROM categories ORDER BY id ASC`
    ).all();

    // Active complaint counts per agent × category × priority
    const rows = db.prepare(`
      SELECT
        c.assigned_to  AS agent_id,
        c.category_id,
        c.priority,
        COUNT(*)       AS cnt
      FROM complaints c
      WHERE c.assigned_to IS NOT NULL
        AND c.status NOT IN ('Resolved', 'Closed')
      GROUP BY c.assigned_to, c.category_id, c.priority
    `).all();

    const catIdMap = {};
    categories.forEach(c => { catIdMap[c.id] = c.category_name; });

    const result = agents.map(agent => {
      const catCounts = {};
      const priCounts = {};
      const catPri    = {};

      categories.forEach(c => {
        catCounts[c.category_name] = 0;
        catPri[c.category_name]    = {};
        PRIORITIES.forEach(p => { catPri[c.category_name][p] = 0; });
      });
      PRIORITIES.forEach(p => { priCounts[p] = 0; });

      rows
        .filter(r => r.agent_id === agent.id)
        .forEach(r => {
          const catName = catIdMap[r.category_id];
          if (!catName) return;
          catCounts[catName]         = (catCounts[catName] || 0) + r.cnt;
          priCounts[r.priority]      = (priCounts[r.priority] || 0) + r.cnt;
          catPri[catName][r.priority] = (catPri[catName][r.priority] || 0) + r.cnt;
        });

      return {
        id:         agent.id,
        name:       agent.name,
        max:        agent.max,
        categories: catCounts,
        priority:   priCounts,
        catPri,
      };
    });

    res.json({
      agents:     result,
      categories: categories.map(c => c.category_name),
    });
  } catch (err) {
    console.error("[workload]", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/workload/agent/:agent_id/capacity — update an agent's max capacity (admin only)
const updateAgentCapacity = (req, res) => {
  try {
    const agentId = parseInt(req.params.agent_id, 10);
    const maxCap  = parseInt(req.body.max_capacity, 10);

    if (!maxCap || maxCap < 1 || maxCap > 100) {
      return res.status(400).json({ message: "max_capacity must be 1–100" });
    }

    // Verify the target is an agent
    const agent = db.prepare(`
      SELECT u.id FROM users u
      JOIN roles r ON r.id = u.role_id AND r.role_name = 'agent'
      WHERE u.id = ?
    `).get(agentId);

    if (!agent) return res.status(404).json({ message: "Agent not found" });

    db.prepare(`
      INSERT INTO agent_settings (agent_id, max_capacity)
      VALUES (?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET max_capacity = excluded.max_capacity
    `).run(agentId, maxCap);

    res.json({ message: "Capacity updated" });
  } catch (err) {
    console.error("[workload]", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getWorkloadOverview, updateAgentCapacity };
