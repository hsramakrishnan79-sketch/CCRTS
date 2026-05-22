const db = require("../config/db");
const { notify, notifyRole } = require("../utils/notify");

const SLA_HOURS = { Low: 72, Medium: 48, High: 24, Critical: 4 };

const VALID_STATUSES = [
  "Open", "Assigned", "In Progress", "Pending Customer Response",
  "Escalated", "Resolved", "Closed",
];

const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];

const slaDeadline = (priority) => {
  const hours = SLA_HOURS[priority] ?? 72;
  return new Date(Date.now() + hours * 3_600_000).toISOString();
};

const recordHistory = (complaint_id, changed_by, old_status, new_status, note = null) => {
  db.prepare(`
    INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(complaint_id, changed_by ?? null, old_status ?? null, new_status, note);
};

const COMPLAINT_SELECT = `
  SELECT c.*,
    u1.name  AS customer_name,
    u1.email AS email,
    u1.phone AS phone,
    cat.category_name AS category,
    u2.name  AS assigned_to_name
  FROM complaints c
  LEFT JOIN users u1       ON u1.id  = c.customer_id
  LEFT JOIN categories cat ON cat.id = c.category_id
  LEFT JOIN users u2       ON u2.id  = c.assigned_to
`;

// ── CREATE COMPLAINT ─────────────────────────────────────────────────────────
const createComplaint = (req, res) => {
  try {
    const { complaint_type, description } = req.body;

    if (!description || !complaint_type) {
      return res.status(400).json({ message: "complaint_type and description are required" });
    }

    const categoryRow = db.prepare("SELECT id FROM categories WHERE category_name = ?").get(complaint_type);
    if (!categoryRow) {
      return res.status(400).json({ message: `Unknown category: ${complaint_type}` });
    }

    const count = db.prepare("SELECT COUNT(*) AS total FROM complaints").get();
    const complaintId = "CMP-" + String(count.total + 1).padStart(3, "0");

    db.prepare(`
      INSERT INTO complaints
        (complaint_id, customer_id, category_id, description, status)
      VALUES (?, ?, ?, ?, 'Open')
    `).run(complaintId, req.user.id, categoryRow.id, description);

    const customer = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
    recordHistory(complaintId, req.user.id, null, "Open", "Complaint registered");
    notifyRole(["admin", "supervisor"], complaintId,
      `New complaint ${complaintId} submitted by ${customer.name} — priority not yet set`);

    res.status(201).json({ message: "Complaint Created Successfully", complaint_id: complaintId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── SET PRIORITY (admin / supervisor only) ───────────────────────────────────
const setPriority = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { priority } = req.body;

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }

    const complaint = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(complaint_id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    const deadline = slaDeadline(priority);

    db.prepare(`
      UPDATE complaints SET priority = ?, sla_deadline = ? WHERE complaint_id = ?
    `).run(priority, deadline, complaint_id);

    res.status(200).json({ message: "Priority updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET ALL COMPLAINTS ───────────────────────────────────────────────────────
const getComplaints = (req, res) => {
  try {
    const complaints = db.prepare(COMPLAINT_SELECT + " ORDER BY c.created_at DESC").all();
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

    const reopened = db.prepare(`
      SELECT COUNT(DISTINCT complaint_id) AS count
      FROM complaint_history
      WHERE old_status = 'Closed' AND new_status = 'Assigned'
    `).get().count;

    res.status(200).json({ ...row, reopened });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── GET COMPLAINT BY ID ──────────────────────────────────────────────────────
const getComplaintById = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db.prepare(COMPLAINT_SELECT + " WHERE c.complaint_id = ?").get(complaint_id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    if (req.user.role === "customer" && complaint.customer_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const history = db.prepare(`
      SELECT ch.*, u.name AS changed_by_name
      FROM complaint_history ch
      LEFT JOIN users u ON u.id = ch.changed_by
      WHERE ch.complaint_id = ?
      ORDER BY ch.changed_at ASC
    `).all(complaint_id);

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

    const complaint = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(complaint_id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    // ── Reopen guard (Closed → Assigned) ────────────────────────────────────
    if (status === "Assigned" && complaint.status === "Closed") {
      if (!["admin", "supervisor"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Only admin or supervisor can reopen a closed complaint",
        });
      }
      if (!note?.trim()) {
        return res.status(400).json({
          message: "A reason is required when reopening a closed complaint",
        });
      }
    }

    // ── Escalation guard ─────────────────────────────────────────────────────
    if (status === "Escalated") {
      const escalatableFrom = ["In Progress", "Pending Customer Response"];
      if (!escalatableFrom.includes(complaint.status)) {
        return res.status(400).json({
          message: `Cannot escalate from '${complaint.status}' — escalation is only allowed from Assigned, In Progress, or Pending Customer Response`,
        });
      }
    }

    // ── Pending Customer Response rules ──────────────────────────────────────
    if (status === "Pending Customer Response") {
      if (!note?.trim()) {
        return res.status(400).json({
          message: "A note is required when moving to Pending Customer Response — specify what information is needed from the customer",
        });
      }
    }

    // ── Resolved rules ───────────────────────────────────────────────────────
    if (status === "Resolved") {
      if (req.user.role !== "agent") {
        return res.status(403).json({
          message: "Only the assigned agent can mark a complaint as Resolved",
        });
      }
      if (complaint.assigned_to !== req.user.id) {
        return res.status(403).json({
          message: "Only the assigned agent can mark a complaint as Resolved",
        });
      }

      const hasNote = note?.trim();
      const hasAttachment = db.prepare(
        "SELECT id FROM attachments WHERE complaint_id = ? LIMIT 1"
      ).get(complaint_id);

      if (!hasNote && !hasAttachment) {
        return res.status(400).json({
          message: "Cannot resolve — either a note or an uploaded attachment is required to document the resolution",
        });
      }

      // Auto-advance: if still Assigned, move to In Progress first is skipped —
      // agent is jumping straight to Resolved with documented evidence, which is acceptable.
    }

    // ── Assigned → In Progress auto-transition on note ───────────────────────
    let effectiveStatus = status;
    if (
      status !== "Resolved" &&
      status !== "Closed" &&
      complaint.status === "Assigned" &&
      note?.trim() &&
      req.user.role === "agent"
    ) {
      effectiveStatus = "In Progress";
    }

    // ── Closing rules ────────────────────────────────────────────────────────
    if (status === "Closed") {
      const feedback = db.prepare("SELECT * FROM feedback WHERE complaint_id = ?").get(complaint_id);

      const daysSinceResolved = complaint.resolved_at
        ? (Date.now() - new Date(complaint.resolved_at).getTime()) / 86_400_000
        : null;

      const forcecloseEligible = daysSinceResolved !== null && daysSinceResolved >= 7;

      if (!feedback && !forcecloseEligible) {
        return res.status(400).json({
          message: "Cannot close — customer feedback not yet submitted. Force-close is allowed after 7 days.",
        });
      }

      if (!feedback && forcecloseEligible) {
        if (!["admin", "supervisor"].includes(req.user.role)) {
          return res.status(403).json({ message: "Only admin or supervisor can force-close a complaint without feedback" });
        }
        if (!note?.trim()) {
          return res.status(400).json({ message: "A note is required when force-closing without customer feedback" });
        }
      }

      if (feedback) {
        if (feedback.rating <= 2) {
          if (!["admin", "supervisor"].includes(req.user.role)) {
            return res.status(403).json({ message: "Low-rated complaints (1–2 stars) can only be closed by admin or supervisor" });
          }
          if (!note?.trim()) {
            return res.status(400).json({ message: "A note is required when closing a low-rated complaint — document the action taken with the customer" });
          }
        }
      }
    }

    const resolvedAt =
      effectiveStatus === "Resolved" ? new Date().toISOString() :
      effectiveStatus === "Assigned" && complaint.status === "Closed" ? null :
      complaint.resolved_at;

    db.prepare(`
      UPDATE complaints SET status = ?, resolved_at = ? WHERE complaint_id = ?
    `).run(effectiveStatus, resolvedAt, complaint_id);

    recordHistory(complaint_id, req.user?.id, complaint.status, effectiveStatus, note ?? null);

    if (effectiveStatus === "Assigned" && complaint.status === "Closed") {
      if (complaint.assigned_to) {
        notify(complaint.assigned_to, complaint_id,
          `Complaint ${complaint_id} has been reopened and reassigned to you`);
      }
      const otherRole = req.user.role === "admin" ? ["supervisor"] : ["admin"];
      notifyRole(otherRole, complaint_id,
        `Complaint ${complaint_id} was reopened by ${req.user.role}`);
    }
    if (effectiveStatus === "Escalated") {
      notifyRole(["admin", "supervisor"], complaint_id, `Complaint ${complaint_id} has been escalated`);
      if (complaint.customer_id) {
        notify(complaint.customer_id, complaint_id,
          `Your complaint ${complaint_id} has been escalated for priority handling.`);
      }
    }
    if (effectiveStatus === "In Progress" && complaint.status !== "In Progress" && complaint.customer_id) {
      notify(complaint.customer_id, complaint_id,
        `Your complaint ${complaint_id} is now being actively worked on.`);
    }
    if (effectiveStatus === "Pending Customer Response" && complaint.customer_id) {
      notify(complaint.customer_id, complaint_id,
        `Your complaint ${complaint_id} requires your attention — the agent needs additional information from you. Please check the complaint details.`);
    }
    if (effectiveStatus === "Resolved" && complaint.customer_id) {
      notify(complaint.customer_id, complaint_id,
        `Your complaint ${complaint_id} has been resolved. Please submit your feedback.`);
    }
    if (effectiveStatus === "Closed" && complaint.customer_id) {
      notify(complaint.customer_id, complaint_id,
        `Your complaint ${complaint_id} has been closed.`);
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
    const { assigned_to, cross_category, note } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ message: "assigned_to is required" });
    }

    const agent = db.prepare("SELECT id, name FROM users WHERE id = ?").get(Number(assigned_to));
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const complaint = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(complaint_id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    // Check agent-category mapping
    const mapping = db.prepare(
      "SELECT 1 FROM agent_categories WHERE agent_id = ? AND category_id = ?"
    ).get(agent.id, complaint.category_id);

    if (!mapping) {
      if (!cross_category) {
        const cat = db.prepare("SELECT category_name FROM categories WHERE id = ?").get(complaint.category_id);
        return res.status(400).json({
          message: `${agent.name} is not assigned to category '${cat?.category_name}'. Use the cross-category override with a mandatory reason.`,
        });
      }
      if (!note?.trim()) {
        return res.status(400).json({ message: "A reason is required for cross-category assignment" });
      }

      // Record the override
      db.prepare(`
        INSERT INTO cross_category_assignments (complaint_id, agent_id, category_id, assigned_by, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(complaint_id, agent.id, complaint.category_id, req.user.id, note.trim());

      // Notify the other management role
      const assigner = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
      const otherRole = req.user.role === "admin" ? ["supervisor"] : ["admin"];
      notifyRole(otherRole, complaint_id,
        `Cross-category override on ${complaint_id}: ${agent.name} assigned by ${assigner?.name ?? req.user.role}. Reason: ${note.trim()}`);
    }

    const newStatus = complaint.status === "Open" ? "Assigned" : complaint.status;

    db.prepare(`
      UPDATE complaints SET assigned_to = ?, status = ? WHERE complaint_id = ?
    `).run(agent.id, newStatus, complaint_id);

    if (newStatus !== complaint.status) {
      recordHistory(complaint_id, req.user?.id, complaint.status, newStatus,
        `Assigned to ${agent.name}${!mapping ? " (cross-category override)" : ""}`);
    }

    const agentMsg = !mapping
      ? `Complaint ${complaint_id} assigned to you (cross-category — outside your specialisation, ${complaint.priority ?? "priority not set"})`
      : `Complaint ${complaint_id} has been assigned to you (${complaint.priority ?? "priority not set"})`;
    notify(agent.id, complaint_id, agentMsg);

    if (complaint.customer_id) {
      notify(complaint.customer_id, complaint_id,
        `Your complaint ${complaint_id} has been assigned to an agent and is under review.`);
    }

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

    const complaint = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(complaint_id);
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

// ── MY COMPLAINTS (customer's own complaints) ────────────────────────────────
const getMyComplaints = (req, res) => {
  try {
    const complaints = db.prepare(
      COMPLAINT_SELECT + " WHERE c.customer_id = ? ORDER BY c.created_at DESC"
    ).all(req.user.id);
    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── MY QUEUE (agent's assigned complaints) ───────────────────────────────────
const getMyQueue = (req, res) => {
  try {
    const complaints = db.prepare(
      COMPLAINT_SELECT + `
      WHERE c.assigned_to = ?
      ORDER BY
        CASE c.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
        c.created_at ASC
      `
    ).all(req.user.id);

    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── MY STATS (agent's personal metrics) ─────────────────────────────────────
const getMyStats = (req, res) => {
  try {
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
        ), 2) AS avgResolutionHours
      FROM complaints WHERE assigned_to = ?
    `).get(req.user.id);

    const reopened = db.prepare(`
      SELECT COUNT(DISTINCT ch.complaint_id) AS count
      FROM complaint_history ch
      JOIN complaints c ON c.complaint_id = ch.complaint_id
      WHERE ch.old_status = 'Closed' AND ch.new_status = 'Assigned'
      AND c.assigned_to = ?
    `).get(req.user.id).count;

    res.status(200).json({ ...row, reopened });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── ESCALATED COMPLAINTS ─────────────────────────────────────────────────────
const getEscalated = (req, res) => {
  try {
    const complaints = db.prepare(
      COMPLAINT_SELECT + `
      WHERE c.status = 'Escalated'
        OR (
          c.sla_deadline IS NOT NULL
          AND c.sla_deadline < datetime('now')
          AND c.status NOT IN ('Resolved', 'Closed', 'Escalated')
        )
      ORDER BY c.sla_deadline ASC
      `
    ).all();

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

    const complaint = db.prepare("SELECT id FROM complaints WHERE complaint_id = ?").get(complaint_id);
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
  getMyComplaints,
  updateComplaintStatus,
  assignComplaint,
  setPriority,
  deleteComplaint,
  getComplaintStats,
  getMyQueue,
  getMyStats,
  getEscalated,
  uploadAttachment,
  getAttachments,
};
