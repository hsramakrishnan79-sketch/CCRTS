const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
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

// forgot / reset password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;