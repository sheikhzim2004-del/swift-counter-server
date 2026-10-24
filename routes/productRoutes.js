import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { verifyAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all products (with search and category filter) - Admin ও Cashier উভয়ই দেখতে পারবে
router.get("/", verifyAuth, async (req, res) => {
    try {
        const { search, category } = req.query;
        const db = getDB();
        const query = {};

        // Search by title or SKU
        if (search && search.trim() !== "") {
            query.$or = [
                { title: { $regex: search.trim(), $options: "i" } },
                { sku: { $regex: search.trim(), $options: "i" } },
            ];
        }

        // Filter by category slug or name
        if (category && category !== "all") {
            query.category = category;
        }

        const products = await db
            .collection("products")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
    }
});

// POST create a new product - শুধুমাত্র Admin পারবে
router.post("/", verifyAuth, requireRole("admin"), async (req, res) => {
    try {
        const { title, sku, category, costPrice, sellingPrice, stockQuantity, lowStockThreshold } = req.body;

        // Field validation
        if (!title || !sku || !category || costPrice === undefined || sellingPrice === undefined || stockQuantity === undefined) {
            return res.status(400).json({ success: false, message: "All required fields must be provided" });
        }

        const db = getDB();
        const cleanSku = sku.trim().toUpperCase();

        // Check duplicate SKU
        const existing = await db.collection("products").findOne({ sku: cleanSku });
        if (existing) {
            return res.status(400).json({ success: false, message: "Product with this SKU already exists" });
        }

        const newProduct = {
            title: title.trim(),
            sku: cleanSku,
            category: category.trim(),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            stockQuantity: Number(stockQuantity),
            lowStockThreshold: Number(lowStockThreshold) || 5,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("products").insertOne(newProduct);

        res.status(201).json({
            success: true,
            message: "Product added successfully",
            data: { _id: result.insertedId, ...newProduct },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create product", error: error.message });
    }
});

// PATCH update stock or product info - শুধুমাত্র Admin পারবে
router.patch("/:id", verifyAuth, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, costPrice, sellingPrice, stockQuantity, lowStockThreshold, category } = req.body;
        const db = getDB();

        const updateFields = { updatedAt: new Date() };
        if (title) updateFields.title = title.trim();
        if (category) updateFields.category = category.trim();
        if (costPrice !== undefined) updateFields.costPrice = Number(costPrice);
        if (sellingPrice !== undefined) updateFields.sellingPrice = Number(sellingPrice);
        if (stockQuantity !== undefined) updateFields.stockQuantity = Number(stockQuantity);
        if (lowStockThreshold !== undefined) updateFields.lowStockThreshold = Number(lowStockThreshold);

        const result = await db.collection("products").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
    }
});

// PUT /api/products/:id - Update product - শুধুমাত্র Admin পারবে
router.put("/:id", verifyAuth, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, sku, category, costPrice, sellingPrice, stockQuantity, lowStockThreshold } = req.body;
        const db = getDB();

        const updateDoc = {
            $set: {
                title: title?.trim(),
                sku: sku?.trim().toUpperCase(),
                category: category?.trim(),
                costPrice: Number(costPrice),
                sellingPrice: Number(sellingPrice),
                stockQuantity: Number(stockQuantity),
                lowStockThreshold: Number(lowStockThreshold) || 5,
                updatedAt: new Date(),
            },
        };

        const result = await db.collection("products").updateOne(
            { _id: new ObjectId(id) },
            updateDoc
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed", error: error.message });
    }
});

// DELETE /api/products/:id - Delete product - শুধুমাত্র Admin পারবে
router.delete("/:id", verifyAuth, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const result = await db.collection("products").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed", error: error.message });
    }
});

export default router;