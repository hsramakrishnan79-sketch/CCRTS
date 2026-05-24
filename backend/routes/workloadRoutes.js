const express  = require("express");
const router   = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getWorkloadOverview, updateAgentCapacity } = require("../controllers/workloadController");

router.use(protect);

router.get("/overview",                    requireRole(["admin", "supervisor"]), getWorkloadOverview);
router.put("/agent/:agent_id/capacity",    requireRole(["admin"]),               updateAgentCapacity);

module.exports = router;
