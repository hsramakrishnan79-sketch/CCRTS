const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getReports, refreshReports } = require("../controllers/reportsController");

router.use(protect);
router.use(requireRole(["admin", "supervisor", "quality"]));

router.get("/", getReports);
router.post("/refresh", requireRole(["admin"]), refreshReports);

module.exports = router;
