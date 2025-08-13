import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import jwt from "jsonwebtoken";
import db from "../config/db.config.js";

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admin_login WHERE username = ?";
  db.query(sql, [username], async (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Login error" });
    }

    if (data.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const admin = data[0]; // Direct comparison of plain text passwords
    if (password !== admin.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
      },
    });
  });
});

// Get current admin
router.get("/me", verifyToken, (req, res) => {
  const sql = "SELECT id, username FROM admin_login WHERE id = ?";
  db.query(sql, [req.user.id], (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error fetching admin details" });
    if (data.length === 0)
      return res.status(404).json({ message: "Admin not found" });
    res.json(data[0]);
  });
});

// Change password
router.put("/change-password", verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const checkSql = "SELECT * FROM admin_login WHERE id = ?";
  db.query(checkSql, [req.user.id], (err, data) => {
    if (err) return res.status(500).json({ error: "Error changing password" });
    if (data.length === 0)
      return res.status(404).json({ message: "Admin not found" });

    const admin = data[0];
    // Direct comparison of plain text passwords
    if (currentPassword !== admin.password) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    // Store new password as plain text
    const updateSql = "UPDATE admin_login SET password = ? WHERE id = ?";
    db.query(updateSql, [newPassword, req.user.id], (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error updating password" });
      res.json({ message: "Password updated successfully" });
    });
  });
});

// Logout - client-side only, just need to remove the token
router.post("/logout", verifyToken, (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
