import express from "express";
import { getDB } from "../db.js";

const router = express.Router();

// GET /api/analytics/dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const db = getDB();

        // আজকের শুরুর এবং শেষের টাইমস্ট্যাম্প (UTC / Local safe)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // 1. Aggregation: আজকের ও সর্বমোট রেভিনিউ এবং অর্ডার সংখ্যা
        const revenueStats = await db.collection("sales").aggregate([
            {
                $facet: {
                    totalStats: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: "$total" },
                                totalOrders: { $sum: 1 },
                            },
                        },
                    ],
                    todayStats: [
                        {
                            $match: {
                                createdAt: { $gte: startOfToday, $lte: endOfToday },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                todayRevenue: { $sum: "$total" },
                                todayOrders: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]).toArray();

        const totalRevenue = revenueStats[0]?.totalStats[0]?.totalRevenue || 0;
        const totalOrders = revenueStats[0]?.totalStats[0]?.totalOrders || 0;
        const todayRevenue = revenueStats[0]?.todayStats[0]?.todayRevenue || 0;
        const todayOrders = revenueStats[0]?.todayStats[0]?.todayOrders || 0;

        // 2. Dynamic Low Stock Count (প্রতিটি প্রোডাক্টের নিজস্ব threshold অনুযায়ী)
        const lowStockCount = await db.collection("products").countDocuments({
            $expr: {
                $lte: [
                    "$stockQuantity",
                    { $ifNull: ["$lowStockThreshold", 5] },
                ],
            },
        });

        // 3. Aggregation: Top 5 Selling Items (রিকোয়ারমেন্ট অনুযায়ী)
        const topSellingProducts = await db.collection("sales").aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    title: { $first: "$items.title" },
                    sku: { $first: "$items.sku" },
                    totalSold: { $sum: "$items.quantity" },
                    revenueGenerated: { $sum: "$items.total" },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
        ]).toArray();

        // 4. সাম্প্রতিক ৫টি সেলস রেকর্ড
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
                todayOrders,
                lowStockCount,
                topSellingProducts,
                recentSales,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Analytics fetch failed", error: error.message });
    }
});

export default router;