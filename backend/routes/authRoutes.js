const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

// test route
router.get("/", (req, res) => {
  res.json({
    message: "Auth Route Working",
  });
});

// register
router.post("/register", registerUser);

// login
router.post("/login", loginUser);

module.exports = router;