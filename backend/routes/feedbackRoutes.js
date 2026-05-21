const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/authMiddleware");
const { submitFeedback, getFeedback } = require("../controllers/feedbackController");

router.use(protect);

router.post("/", submitFeedback);
router.get("/", getFeedback);

module.exports = router;
