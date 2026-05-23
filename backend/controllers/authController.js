const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");
const { sendResetEmail } = require("../utils/mailer");

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const roleRow = db.prepare("SELECT id FROM roles WHERE role_name = ?").get(role);
    if (!roleRow) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    db.prepare(`
      INSERT INTO users (name, email, password, role_id)
      VALUES (?, ?, ?, ?)
    `).run(name, email, hashedPassword, roleRow.id);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare(`
      SELECT u.*, r.role_name AS role
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.email = ?
    `).get(email);

    if (!user) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMsg = "If an account with that email exists, a password reset link has been sent.";

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.json({ message: genericMsg });

    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expires = new Date(Date.now() + 3_600_000).toISOString();

    db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?")
      .run(hashedToken, expires, user.id);

    const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${plainToken}`;
    await sendResetEmail(user.email, resetUrl);

    res.json({ message: genericMsg });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = db.prepare(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?"
    ).get(hashedToken, new Date().toISOString());

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    db.prepare(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?"
    ).run(hashedPassword, user.id);

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
