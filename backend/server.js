const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const db = require("./config/db");
const { notifyRole } = require("./utils/notify");

const authRoutes         = require("./routes/authRoutes");
const complaintRoutes    = require("./routes/complaintRoutes");
const feedbackRoutes     = require("./routes/feedbackRoutes");
const userRoutes         = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportsRoutes      = require("./routes/reportsRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",                  authRoutes);
app.use("/api/complaints",            complaintRoutes);
app.use("/api/feedback/:complaint_id",feedbackRoutes);
app.use("/api/users",                 userRoutes);
app.use("/api/notifications",         notificationRoutes);
app.use("/api/reports",               reportsRoutes);

app.get("/", (_req, res) => res.send("CCRTS Backend Running"));

// ── SLA Auto-Escalation Job ──────────────────────────────────────────────────
const runSlaEscalation = () => {
  try {
    const breached = db.prepare(`
      SELECT complaint_id, status
      FROM complaints
      WHERE sla_deadline IS NOT NULL
        AND sla_deadline < datetime('now')
        AND status NOT IN ('Resolved', 'Closed', 'Escalated')
    `).all();

    for (const c of breached) {
      db.prepare("UPDATE complaints SET status = 'Escalated' WHERE complaint_id = ?")
        .run(c.complaint_id);

      db.prepare(`
        INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, note)
        VALUES (?, NULL, ?, 'Escalated', 'Auto-escalated: SLA deadline breached')
      `).run(c.complaint_id, c.status);

      notifyRole(["admin", "supervisor"], c.complaint_id,
        `Complaint ${c.complaint_id} auto-escalated: SLA deadline breached`);
    }

    if (breached.length > 0) {
      console.log(`[SLA] Auto-escalated ${breached.length} complaint(s)`);
    }
  } catch (err) {
    console.error("[SLA] Escalation job error:", err.message);
  }
};

// Run once on startup, then every 5 minutes
runSlaEscalation();
setInterval(runSlaEscalation, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
