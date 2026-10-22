import express from "express";
import { getDB } from "../db.js";

const router = express.Router();

// GET /api/analytics/dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const db = getDB();

        // 1. Total Revenue & Total Orders
        const sales = await db.collection("sales").find({}).toArray();
        const totalRevenue = sales.reduce((sum, item) => sum + (item.total || 0), 0);
        const totalOrders = sales.length;

        // 2. Today's Sales
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todaySales = sales.filter(
            (item) => new Date(item.createdAt) >= startOfToday
        );
        const todayRevenue = todaySales.reduce((sum, item) => sum + (item.total || 0), 0);

        // 3. Low Stock Items count (Stock <= 5)
        const lowStockCount = await db.collection("products").countDocuments({
            stockQuantity: { $lte: 5 },
        });

        // 4. Recent 5 Invoices
        const recentSales = await db
            .collection("sales")
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();

        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                todayRevenue,
                totalOrders,
                todayOrders: todaySales.length,
                lowStockCount,
                recentSales,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Analytics fetch failed", error: error.message });
    }
});

export default router;