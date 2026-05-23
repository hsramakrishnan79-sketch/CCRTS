const bcrypt = require("bcryptjs");
const db = require("../config/db");

const VALID_ROLES = ["admin", "agent", "supervisor", "customer", "quality"];

// GET /api/users/agents — agent list for assignment dropdowns
const getAgents = (req, res) => {
  try {
    const agents = db.prepare(`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.role_name = 'agent'
      ORDER BY u.name ASC
    `).all();
    res.status(200).json(agents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/users/all
const getAllUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, r.role_name AS role
      FROM users u JOIN roles r ON r.id = u.role_id
      ORDER BY u.id ASC
    `).all();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// POST /api/users — admin creates a user
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ message: "A user with that email already exists" });
    }

    const roleRow = db.prepare("SELECT id FROM roles WHERE role_name = ?").get(role);
    const hashed = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (name, email, phone, password, role_id) VALUES (?, ?, ?, ?, ?)")
      .run(name, email, phone ?? null, hashed, roleRow.id);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/users/:id/role
const updateUserRole = (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    }

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const roleRow = db.prepare("SELECT id FROM roles WHERE role_name = ?").get(role);
    db.prepare("UPDATE users SET role_id = ? WHERE id = ?").run(roleRow.id, id);
    res.status(200).json({ message: "Role updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/users/:id
const deleteUser = (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/users/my-score — agent's own rolling 30-day performance score
const getMyScore = (req, res) => {
  try {
    const agentId = req.user.id;

    const row = db.prepare(`
      SELECT
        COUNT(DISTINCT c.id)                                              AS totalHandled,
        ROUND(AVG(f.rating), 1)                                           AS avgRating,
        SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.sla_deadline IS NOT NULL
                  AND c.resolved_at <= c.sla_deadline THEN 1 ELSE 0 END) AS onTime,
        SUM(CASE WHEN c.resolved_at IS NOT NULL
                  AND c.sla_deadline IS NOT NULL THEN 1 ELSE 0 END)      AS totalResolved
      FROM complaints c
      LEFT JOIN feedback f ON f.complaint_id = c.complaint_id
      WHERE c.assigned_to = ?
        AND c.created_at >= date('now', '-30 days')
    `).get(agentId);

    const reopened = db.prepare(`
      SELECT COUNT(DISTINCT ch.complaint_id) AS count
      FROM complaint_history ch
      JOIN complaints c ON c.complaint_id = ch.complaint_id
      WHERE ch.old_status = 'Closed' AND ch.new_status = 'Assigned'
        AND c.assigned_to = ?
        AND ch.changed_at >= date('now', '-30 days')
    `).get(agentId).count;

    const slaCompliance = row.totalResolved > 0
      ? Math.round((row.onTime / row.totalResolved) * 100) : null;
    const ratingScore = row.avgRating   != null ? (row.avgRating   / 5)   * 50 : 25;
    const slaScore    = slaCompliance   != null ? (slaCompliance   / 100) * 30 : 15;
    const reopenRate  = row.totalHandled > 0    ? reopened / row.totalHandled  : 0;
    const reopenScore = (1 - Math.min(reopenRate, 1)) * 20;
    const score       = Math.round(ratingScore + slaScore + reopenScore);

    res.json({
      score,
      breakdown: { avgRating: row.avgRating, slaCompliance, reopened, totalHandled: row.totalHandled },
      period: "Last 30 Days",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getAgents, getAllUsers, createUser, updateUserRole, deleteUser, getMyScore };
