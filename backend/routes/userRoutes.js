const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getAgents, getAllUsers, createUser, updateUserRole, deleteUser, getMyScore } = require("../controllers/userController");

router.use(protect);

router.get("/my-score", requireRole("agent"), getMyScore);

// Agent list is accessible to admin and supervisor (for assignment dropdowns)
router.get("/agents", requireRole(["admin", "supervisor"]), getAgents);

// All other user management is admin-only
router.get("/all",      requireRole("admin"), getAllUsers);
router.post("/",        requireRole("admin"), createUser);
router.put("/:id/role", requireRole("admin"), updateUserRole);
router.delete("/:id",   requireRole("admin"), deleteUser);

module.exports = router;
