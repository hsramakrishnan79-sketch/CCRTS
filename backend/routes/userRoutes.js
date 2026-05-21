const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getAllUsers, createUser, updateUserRole, deleteUser } = require("../controllers/userController");

// All user management is admin-only
router.use(protect);
router.use(requireRole("admin"));

router.get("/all", getAllUsers);
router.post("/", createUser);
router.put("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

module.exports = router;
