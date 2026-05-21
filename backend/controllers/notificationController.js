const db = require("../config/db");

// GET /api/notifications  — current user's 30 most recent
const getNotifications = (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, created_at DESC
      LIMIT 30
    `).all(req.user.id);

    res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/notifications/count  — unread count only
const getUnreadCount = (req, res) => {
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0")
      .get(req.user.id);

    res.status(200).json({ count: row.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/notifications/:id/read
const markRead = (req, res) => {
  try {
    db.prepare(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?"
    ).run(req.params.id, req.user.id);

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/notifications/read-all
const markAllRead = (req, res) => {
  try {
    db.prepare(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?"
    ).run(req.user.id);

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };
