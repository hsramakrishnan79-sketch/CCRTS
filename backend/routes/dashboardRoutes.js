const express = require("express");
const router  = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getAdminDashboard, getSupervisorDashboard, getQualityDashboard, getAgentPerformance } = require("../controllers/dashboardController");

router.use(protect);

router.get("/admin",             requireRole("admin"),                             getAdminDashboard);
router.get("/supervisor",        requireRole(["admin", "supervisor"]),             getSupervisorDashboard);
router.get("/quality",           requireRole(["admin", "supervisor", "quality"]),  getQualityDashboard);
router.get("/agent-performance", requireRole(["admin", "quality"]),                getAgentPerformance);

module.exports = router;
