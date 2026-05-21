const db = require("../config/db");

const submitFeedback = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { rating, comments } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const complaint = db
      .prepare("SELECT * FROM complaints WHERE complaint_id = ?")
      .get(complaint_id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint Not Found" });
    }

    if (!["Resolved", "Closed"].includes(complaint.status)) {
      return res.status(400).json({ message: "Feedback can only be submitted for Resolved or Closed complaints" });
    }

    const existing = db
      .prepare("SELECT id FROM feedback WHERE complaint_id = ?")
      .get(complaint_id);

    if (existing) {
      return res.status(409).json({ message: "Feedback already submitted for this complaint" });
    }

    db.prepare(`
      INSERT INTO feedback (complaint_id, customer_id, rating, comments)
      VALUES (?, ?, ?, ?)
    `).run(complaint_id, req.user?.id ?? null, ratingNum, comments ?? null);

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getFeedback = (req, res) => {
  try {
    const { complaint_id } = req.params;
    const feedback = db
      .prepare("SELECT * FROM feedback WHERE complaint_id = ?")
      .get(complaint_id);

    res.status(200).json(feedback ?? null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { submitFeedback, getFeedback };
