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

// Notify specific user IDs
const notify = (user_id, complaint_id, message) => _insert(user_id, complaint_id, message);

// Notify all users whose role is in the given array
const notifyRole = (roles, complaint_id, message) => {
  const placeholders = roles.map(() => "?").join(",");
  const users = db
    .prepare(`SELECT id FROM users WHERE role IN (${placeholders})`)
    .all(...roles);
  for (const u of users) _insert(u.id, complaint_id, message);
};

// Notify a single user looked up by their display name
const notifyByName = (name, complaint_id, message) => {
  const user = db.prepare("SELECT id FROM users WHERE name = ?").get(name);
  if (user) _insert(user.id, complaint_id, message);
};

// Notify a single user looked up by email
const notifyByEmail = (email, complaint_id, message) => {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (user) _insert(user.id, complaint_id, message);
};

module.exports = { notify, notifyRole, notifyByName, notifyByEmail };
