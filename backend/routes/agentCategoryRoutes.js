const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getMappings, getCategories, addMapping, removeMapping } = require("../controllers/agentCategoryController");

router.use(protect);

router.get("/",                          requireRole(["admin", "supervisor"]), getMappings);
router.get("/categories",                requireRole(["admin", "supervisor"]), getCategories);
router.post("/",                         requireRole("admin"),                 addMapping);
router.delete("/:agent_id/:category_id", requireRole("admin"),                 removeMapping);

module.exports = router;
