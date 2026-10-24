import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { verifyAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/sales - Process Checkout (Atomic Stock Update)
// Admin ও Cashier উভয়ই সেলস প্রসেস করতে পারবে
router.post("/", verifyAuth, async (req, res) => {
    try {
        const { items, subtotal, discount, total, paymentMethod, customerName } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: "Cart cannot be empty" });
        }

        const db = getDB();
        const deductedProducts = [];

        // অ্যাটমিকালি প্রতিটি প্রোডাক্টের স্টক যাচাই ও ডিডাক্ট করা
        for (const item of items) {
            const result = await db.collection("products").findOneAndUpdate(
                {
                    _id: new ObjectId(item._id),
                    stockQuantity: { $gte: Number(item.quantity) }, // স্টক পর্যাপ্ত থাকলেই কেবল আপডেট হবে
                },
                {
                    $inc: { stockQuantity: -Number(item.quantity) },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "before" }
            );

            // পর্যাপ্ত স্টক না থাকলে বা প্রোডাক্ট না পাওয়া গেলে রোলব্যাক
            if (!result) {
                // পূর্ববর্তী যে আইটেমগুলোর স্টক কাটা হয়েছিল তা ফেরত দেওয়া (Rollback)
                for (const rollbackItem of deductedProducts) {
                    await db.collection("products").updateOne(
                        { _id: new ObjectId(rollbackItem.id) },
                        { $inc: { stockQuantity: rollbackItem.qty } }
                    );
                }

                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock or unavailable item: ${item.title}`,
                });
            }

            deductedProducts.push({ id: item._id, qty: Number(item.quantity) });
        }

        // ইনভয়েস রেকর্ড তৈরি (লগইন করা ক্যাশিয়ারের তথ্যসহ)
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        const saleRecord = {
            invoiceNumber,
            customerName: customerName?.trim() || "Walk-in Customer",
            items: items.map((i) => ({
                productId: i._id,
                title: i.title,
                sku: i.sku,
                price: Number(i.sellingPrice),
                quantity: Number(i.quantity),
                total: Number(i.sellingPrice) * Number(i.quantity),
            })),
            subtotal: Number(subtotal),
            discount: Number(discount) || 0,
            total: Number(total),
            paymentMethod: paymentMethod || "Cash",
            cashierId: req.user.userId,
            cashierName: req.user.name,
            createdAt: new Date(),
        };

        const result = await db.collection("sales").insertOne(saleRecord);

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: { _id: result.insertedId, invoiceNumber, total: saleRecord.total },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Checkout failed", error: error.message });
    }
});

// GET /api/sales - Sales history
// Admin ও Cashier উভয়ই হিস্ট্রি দেখতে পারবে
router.get("/", verifyAuth, async (req, res) => {
    try {
        const db = getDB();
        const sales = await db.collection("sales").find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: sales });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch sales", error: error.message });
    }
});

// DELETE /api/sales/:id - Delete sales record
// শুধুমাত্র Admin হিস্ট্রি মুছতে পারবে
router.delete("/:id", verifyAuth, requireRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const result = await db.collection("sales").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Sale record not found" });
        }

        res.status(200).json({ success: true, message: "Sale record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete sale record", error: error.message });
    }
});

export default router;