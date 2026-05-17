const db = require("../config/db");

const createComplaint = (req, res) => {
  try {
    const {
      customer_name,
      email,
      complaint_type,
      description,
      priority,
    } = req.body;

    // generate complaint ID
    const count = db
      .prepare("SELECT COUNT(*) AS total FROM complaints")
      .get();

    const complaintId =
      "CMP" + String(count.total + 1).padStart(3, "0");

    db.prepare(`
      INSERT INTO complaints
      (
        complaint_id,
        customer_name,
        email,
        category,
        description,
        priority,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      complaintId,
      customer_name,
      email,
      complaint_type,
      description,
      priority,
      "Pending"
    );

    res.status(201).json({
      message: "Complaint Created Successfully",
      complaint_id: complaintId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// GET ALL COMPLAINTS
const getComplaints = (req, res) => {
  try {
    const complaints = db
      .prepare("SELECT * FROM complaints")
      .all();

    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};
const getComplaintStats = (req, res) => {
  try {
    const total = db
      .prepare(
        "SELECT COUNT(*) AS count FROM complaints"
      )
      .get();

    const pending = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM complaints
         WHERE status = 'Pending'`
      )
      .get();

    const inProgress = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM complaints
         WHERE status = 'In Progress'`
      )
      .get();

    const resolved = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM complaints
         WHERE status = 'Resolved'`
      )
      .get();

    res.status(200).json({
      total: total.count,
      pending: pending.count,
      inProgress:
        inProgress.count,
      resolved: resolved.count,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateComplaintStatus = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { status } = req.body;

    const complaint = db
      .prepare(
        "SELECT * FROM complaints WHERE complaint_id = ?"
      )
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint Not Found",
      });
    }

    db.prepare(`
      UPDATE complaints
      SET status = ?
      WHERE complaint_id = ?
    `).run(status, complaint_id);

    res.status(200).json({
      message: "Complaint Status Updated",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getComplaintById = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db
      .prepare(
        "SELECT * FROM complaints WHERE complaint_id = ?"
      )
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint Not Found",
      });
    }

    res.status(200).json(complaint);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const deleteComplaint = (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = db
      .prepare(
        "SELECT * FROM complaints WHERE complaint_id = ?"
      )
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint Not Found",
      });
    }

    db.prepare(`
      DELETE FROM complaints
      WHERE complaint_id = ?
    `).run(complaint_id);

    res.status(200).json({
      message: "Complaint Deleted Successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const assignComplaint = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { assigned_to } = req.body;

    const complaint = db
      .prepare(
        "SELECT * FROM complaints WHERE complaint_id = ?"
      )
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint Not Found",
      });
    }

    db.prepare(`
      UPDATE complaints
      SET assigned_to = ?
      WHERE complaint_id = ?
    `).run(assigned_to, complaint_id);

    res.status(200).json({
      message: "Complaint Assigned Successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
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
};

