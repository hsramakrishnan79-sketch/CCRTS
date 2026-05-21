const db = require("../config/db");
const { notifyRole, notifyByName, notifyByEmail } = require("../utils/notify");

// SLA hours per priority level
const SLA_HOURS = { Low: 72, Medium: 48, High: 24, Critical: 4 };

const VALID_STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Pending Customer Response",
  "Escalated",
  "Resolved",
  "Closed",
];

const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];

// Compute ISO deadline string from now + hours
const slaDeadline = (priority) => {
  const hours = SLA_HOURS[priority] ?? 72;
  const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  return deadline.toISOString();
};

// Insert a row into complaint_history
const recordHistory = (complaint_id, changed_by, old_status, new_status, note = null) => {
  db.prepare(`
    INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(complaint_id, changed_by ?? null, old_status ?? null, new_status, note);
};

// ── CREATE COMPLAINT ─────────────────────────────────────────────────────────
const createComplaint = (req, res) => {
  try {
    const { customer_name, email, phone, complaint_type, description, priority } = req.body;

    if (!customer_name || !description || !priority || !complaint_type) {
      return res.status(400).json({ message: "customer_name, complaint_type, description and priority are required" });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }

    const count = db.prepare("SELECT COUNT(*) AS total FROM complaints").get();
    const complaintId = "CMP" + String(count.total + 1).padStart(3, "0");
    const deadline = slaDeadline(priority);

    db.prepare(`
      INSERT INTO complaints
        (complaint_id, customer_name, email, phone, category, description, priority, status, sla_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `).run(complaintId, customer_name, email ?? null, phone ?? null, complaint_type, description, priority, deadline);

    recordHistory(complaintId, req.user?.id, null, "Open", "Complaint registered");
    notifyRole(["admin", "supervisor"], complaintId, `New complaint ${complaintId} submitted by ${customer_name} (${priority} priority)`);

    res.status(201).json({ message: "Complaint Created Successfully", complaint_id: complaintId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET ALL COMPLAINTS ───────────────────────────────────────────────────────
const getComplaints = (req, res) => {
  try {
    const complaints = db.prepare("SELECT * FROM complaints ORDER BY created_at DESC").all();
    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET COMPLAINT STATS ──────────────────────────────────────────────────────
const getComplaintStats = (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*)                                                          AS total,
        SUM(status = 'Open')                                              AS open,
        SUM(status = 'Assigned')                                          AS assigned,
        SUM(status = 'In Progress')                                       AS inProgress,
        SUM(status = 'Pending Customer Response')                         AS pendingCustomer,
        SUM(status = 'Escalated')                                         AS escalated,
        SUM(status = 'Resolved')                                          AS resolved,
        SUM(status = 'Closed')                                            AS closed,
        SUM(
          sla_deadline IS NOT NULL
          AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved','Closed')
        )                                                                 AS slaBreaches,
        ROUND(
          AVG(
            CASE WHEN resolved_at IS NOT NULL
            THEN (julianday(resolved_at) - julianday(created_at)) * 24
            END
          ), 2
        )                                                                 AS avgResolutionHours
      FROM complaints
    `).get();

    res.status(200).json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET COMPLAINT BY ID ──────────────────────────────────────────────────────
const getComplaintById = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db
      .prepare("SELECT * FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    const history = db
      .prepare(`
        SELECT ch.*, u.name AS changed_by_name
        FROM complaint_history ch
        LEFT JOIN users u ON u.id = ch.changed_by
        WHERE ch.complaint_id = ?
        ORDER BY ch.changed_at ASC
      `)
      .all(complaint_id);

    res.status(200).json({ ...complaint, history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── UPDATE COMPLAINT STATUS ──────────────────────────────────────────────────
const updateComplaintStatus = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { status, note } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const complaint = db
      .prepare("SELECT * FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    const resolvedAt =
      status === "Resolved" || status === "Closed"
        ? new Date().toISOString()
        : complaint.resolved_at;

    db.prepare(`
      UPDATE complaints
      SET status = ?, resolved_at = ?
      WHERE complaint_id = ?
    `).run(status, resolvedAt, complaint_id);

    recordHistory(complaint_id, req.user?.id, complaint.status, status, note ?? null);

    if (status === "Escalated") {
      notifyRole(["admin", "supervisor"], complaint_id, `Complaint ${complaint_id} has been escalated`);
    }
    if (status === "Resolved" || status === "Closed") {
      notifyByEmail(complaint.email, complaint_id, `Your complaint ${complaint_id} has been ${status.toLowerCase()}`);
    }

    res.status(200).json({ message: "Complaint Status Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── ASSIGN COMPLAINT ─────────────────────────────────────────────────────────
const assignComplaint = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ message: "assigned_to is required" });
    }

    const complaint = db
      .prepare("SELECT * FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    // Auto-advance status to Assigned when assigning for the first time
    const newStatus =
      complaint.status === "Open" ? "Assigned" : complaint.status;

    db.prepare(`
      UPDATE complaints
      SET assigned_to = ?, status = ?
      WHERE complaint_id = ?
    `).run(assigned_to, newStatus, complaint_id);

    if (newStatus !== complaint.status) {
      recordHistory(complaint_id, req.user?.id, complaint.status, newStatus, `Assigned to ${assigned_to}`);
    }
    notifyByName(assigned_to, complaint_id, `Complaint ${complaint_id} has been assigned to you (${complaint.priority} priority)`);

    res.status(200).json({ message: "Complaint Assigned Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── DELETE COMPLAINT ─────────────────────────────────────────────────────────
const deleteComplaint = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db
      .prepare("SELECT * FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    db.prepare("DELETE FROM complaints WHERE complaint_id = ?").run(complaint_id);
    db.prepare("DELETE FROM complaint_history WHERE complaint_id = ?").run(complaint_id);

    res.status(200).json({ message: "Complaint Deleted Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── MY QUEUE (agent's assigned complaints) ───────────────────────────────────
const getMyQueue = (req, res) => {
  try {
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const complaints = db.prepare(`
      SELECT * FROM complaints WHERE assigned_to = ? ORDER BY
        CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
        created_at ASC
    `).all(user.name);

    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── MY STATS (agent's personal metrics) ─────────────────────────────────────
const getMyStats = (req, res) => {
  try {
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const row = db.prepare(`
      SELECT
        COUNT(*)                           AS total,
        SUM(status = 'Assigned')           AS assigned,
        SUM(status = 'In Progress')        AS inProgress,
        SUM(status = 'Escalated')          AS escalated,
        SUM(status = 'Resolved')           AS resolved,
        SUM(status = 'Closed')             AS closed,
        ROUND(AVG(
          CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24
          END
        ), 2)                              AS avgResolutionHours
      FROM complaints WHERE assigned_to = ?
    `).get(user.name);

    res.status(200).json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── ESCALATED COMPLAINTS ─────────────────────────────────────────────────────
const getEscalated = (req, res) => {
  try {
    const complaints = db.prepare(`
      SELECT * FROM complaints
      WHERE status = 'Escalated'
        OR (
          sla_deadline IS NOT NULL
          AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved', 'Closed', 'Escalated')
        )
      ORDER BY sla_deadline ASC
    `).all();

    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── UPLOAD ATTACHMENT ────────────────────────────────────────────────────────
const uploadAttachment = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db
      .prepare("SELECT id FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    db.prepare(`
      INSERT INTO attachments (complaint_id, file_name, file_path, uploaded_by)
      VALUES (?, ?, ?, ?)
    `).run(complaint_id, req.file.originalname, req.file.filename, req.user?.id ?? null);

    res.status(201).json({ message: "File uploaded successfully", filename: req.file.filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET ATTACHMENTS ──────────────────────────────────────────────────────────
const getAttachments = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const attachments = db.prepare(`
      SELECT a.*, u.name AS uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON u.id = a.uploaded_by
      WHERE a.complaint_id = ?
      ORDER BY a.uploaded_at DESC
    `).all(complaint_id);

    res.status(200).json(attachments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  deleteComplaint,
  getComplaintStats,
  getMyQueue,
  getMyStats,
  getEscalated,
  uploadAttachment,
  getAttachments,
};
