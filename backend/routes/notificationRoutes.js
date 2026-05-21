const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/",           getNotifications);
router.get("/count",      getUnreadCount);
router.put("/read-all",   markAllRead);
router.put("/:id/read",   markRead);

module.exports = router;
