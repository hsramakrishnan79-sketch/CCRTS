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

module.exports = { getAgents, getAllUsers, createUser, updateUserRole, deleteUser };
