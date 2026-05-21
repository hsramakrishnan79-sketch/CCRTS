const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
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
} = require("../controllers/complaintController");

// All complaint routes require a valid JWT
router.use(protect);

// Create complaint — any authenticated user
router.post("/create", createComplaint);

// Global list + stats — admin, agent, supervisor
router.get("/all",    requireRole(["admin", "agent", "supervisor", "quality"]), getComplaints);
router.get("/stats",  requireRole(["admin", "agent", "supervisor", "quality"]), getComplaintStats);

// Agent-specific routes — must be before /:complaint_id
router.get("/my-queue", requireRole("agent"), getMyQueue);
router.get("/my-stats", requireRole("agent"), getMyStats);

// Escalation view — admin, supervisor
router.get("/escalated", requireRole(["admin", "supervisor"]), getEscalated);

// Attachments — must come before /:complaint_id
router.post("/:complaint_id/attachments", upload.single("file"), uploadAttachment);
router.get("/:complaint_id/attachments", getAttachments);

// Single complaint — any authenticated user
router.get("/:complaint_id", getComplaintById);

// Status update — admin, agent, supervisor
router.put("/update-status/:complaint_id", requireRole(["admin", "agent", "supervisor"]), updateComplaintStatus);

// Assign — admin, supervisor
router.put("/assign/:complaint_id", requireRole(["admin", "supervisor"]), assignComplaint);

// Delete — admin only
router.delete("/delete/:complaint_id", requireRole("admin"), deleteComplaint);

module.exports = router;
