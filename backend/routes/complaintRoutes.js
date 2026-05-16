const express = require("express");

const router = express.Router();

const {
  createComplaint,
  getComplaints,
  updateComplaintStatus,
  getComplaintById,
  deleteComplaint,
  assignComplaint,
} = require("../controllers/complaintController");

// test route
router.get("/", (req, res) => {
  res.json({
    message: "Complaint Route Working",
  });
});

// create complaint
router.post("/create", createComplaint);

// get all complaints
router.get("/all", getComplaints);

// get complaint by ID
router.get("/:complaint_id", getComplaintById);

// update complaint status
router.put(
  "/update-status/:complaint_id",
  updateComplaintStatus
);

router.delete(
  "/delete/:complaint_id",
  deleteComplaint
);

router.put(
  "/assign/:complaint_id",
  assignComplaint
);

module.exports = router;