import express from "express";
import { getDB } from "../db.js";

const router = express.Router();

// GET all categories
router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const categories = await db
            .collection("categories")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// POST create a category
router.post("/", async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const db = getDB();
        const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

        const existing = await db.collection("categories").findOne({ slug });
        if (existing) {
            return res.status(400).json({ success: false, message: "Category already exists" });
        }

        const newCategory = {
            name: name.trim(),
            slug,
            description: description || "",
            createdAt: new Date(),
        };

        const result = await db.collection("categories").insertOne(newCategory);

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: { _id: result.insertedId, ...newCategory },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

export default router;