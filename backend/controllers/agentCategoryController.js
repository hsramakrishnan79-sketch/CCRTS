const db = require("../config/db");

const getMappings = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT ac.agent_id, u.name AS agent_name, u.email AS agent_email,
             ac.category_id, c.category_name
      FROM agent_categories ac
      JOIN users u ON u.id = ac.agent_id
      JOIN categories c ON c.id = ac.category_id
      ORDER BY c.category_name, u.name
    `).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

const getCategories = (req, res) => {
  try {
    const rows = db.prepare("SELECT id, category_name FROM categories ORDER BY category_name").all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

const addMapping = (req, res) => {
  try {
    const { agent_id, category_id } = req.body;
    if (!agent_id || !category_id) {
      return res.status(400).json({ message: "agent_id and category_id are required" });
    }

    const agentRoleId = db.prepare("SELECT id FROM roles WHERE role_name = 'agent'").get().id;
    const agent = db.prepare("SELECT id FROM users WHERE id = ? AND role_id = ?").get(Number(agent_id), agentRoleId);
    if (!agent) {
      return res.status(400).json({ message: "User is not an agent" });
    }

    const category = db.prepare("SELECT id FROM categories WHERE id = ?").get(Number(category_id));
    if (!category) {
      return res.status(400).json({ message: "Category not found" });
    }

    db.prepare("INSERT OR IGNORE INTO agent_categories (agent_id, category_id) VALUES (?, ?)")
      .run(Number(agent_id), Number(category_id));
    res.json({ message: "Mapping added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

const removeMapping = (req, res) => {
  try {
    const { agent_id, category_id } = req.params;

    const count = db.prepare("SELECT COUNT(*) AS cnt FROM agent_categories WHERE category_id = ?")
      .get(Number(category_id)).cnt;
    if (count <= 1) {
      return res.status(400).json({ message: "Cannot remove: every category must have at least one agent assigned" });
    }

    db.prepare("DELETE FROM agent_categories WHERE agent_id = ? AND category_id = ?")
      .run(Number(agent_id), Number(category_id));
    res.json({ message: "Mapping removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getMappings, getCategories, addMapping, removeMapping };
