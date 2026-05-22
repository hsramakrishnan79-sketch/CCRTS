const db = require("../config/db");

const _insert = (user_id, complaint_id, message) => {
  try {
    db.prepare(
      "INSERT INTO notifications (user_id, complaint_id, message) VALUES (?, ?, ?)"
    ).run(user_id, complaint_id ?? null, message);
  } catch (err) {
    console.error("[Notify]", err.message);
  }
};

const notify = (user_id, complaint_id, message) => _insert(user_id, complaint_id, message);

const notifyRole = (roles, complaint_id, message) => {
  const placeholders = roles.map(() => "?").join(",");
  const users = db.prepare(`
    SELECT u.id FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.role_name IN (${placeholders})
  `).all(...roles);
  for (const u of users) _insert(u.id, complaint_id, message);
};

const notifyByName = (name, complaint_id, message) => {
  const user = db.prepare("SELECT id FROM users WHERE name = ?").get(name);
  if (user) _insert(user.id, complaint_id, message);
};

const notifyByEmail = (email, complaint_id, message) => {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (user) _insert(user.id, complaint_id, message);
};

module.exports = { notify, notifyRole, notifyByName, notifyByEmail };
