import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDB } from "../db.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const db = getDB();
        const cleanEmail = email.trim();

        // Case-insensitive email search
        const user = await db.collection("users").findOne({
            email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // পাসওয়ার্ড যাচাই
        const isMatch = await bcrypt.compare(String(password).trim(), user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // JWT টোকেন তৈরি
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                name: user.name,
            },
            process.env.JWT_SECRET || "swift_counter_pos_secret_key_2026",
            { expiresIn: "24h" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("❌ Auth error:", error);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message,
        });
    }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;

        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, current password, and new password are required",
            });
        }

        const db = getDB();
        const cleanEmail = email.trim();

        const user = await db.collection("users").findOne({
            email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // পুরাতন পাসওয়ার্ড ম্যাচ করে কিনা চেক
        const isMatch = await bcrypt.compare(String(currentPassword).trim(), user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }

        // নতুন পাসওয়ার্ড হ্যাশ করা
        const newHashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);

        // ডেটাবেসে আপডেট করা
        await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { password: newHashedPassword, updatedAt: new Date() } }
        );

        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("❌ Change password error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;