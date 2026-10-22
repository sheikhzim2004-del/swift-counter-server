import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

const router = express.Router();

// POST /api/sales - Process Checkout
router.post("/", async (req, res) => {
    try {
        const { items, subtotal, discount, total, paymentMethod, customerName } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: "Cart cannot be empty" });
        }

        const db = getDB();

        // 1. Check stock availability for all items
        for (const item of items) {
            const product = await db.collection("products").findOne({ _id: new ObjectId(item._id) });
            if (!product) {
                return res.status(404).json({ success: false, message: `Product ${item.title} not found` });
            }
            if (product.stockQuantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.title}. Available: ${product.stockQuantity}`,
                });
            }
        }

        // 2. Deduct inventory stock
        for (const item of items) {
            await db.collection("products").updateOne(
                { _id: new ObjectId(item._id) },
                {
                    $inc: { stockQuantity: -item.quantity }, $set: { updatedAt: new Date() }
                }
            );
        }

        // 3. Create Sale Record / Invoice
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        const saleRecord = {
            invoiceNumber,
            customerName: customerName || "Walk-in Customer",
            items: items.map((i) => ({
                productId: i._id,
                title: i.title,
                sku: i.sku,
                price: i.sellingPrice,
                quantity: i.quantity,
                total: i.sellingPrice * i.quantity,
            })),
            subtotal: Number(subtotal),
            discount: Number(discount) || 0,
            total: Number(total),
            paymentMethod: paymentMethod || "Cash",
            createdAt: new Date(),
        };

        const result = await db.collection("sales").insertOne(saleRecord);

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: { _id: result.insertedId, invoiceNumber, total },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Checkout failed", error: error.message });
    }
});

// GET /api/sales - Sales history
router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const sales = await db.collection("sales").find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: sales });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch sales", error: error.message });
    }
});

export default router;