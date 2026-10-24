import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
}

const client = new MongoClient(uri);

const categories = [
    { name: "Beverages", slug: "beverages", description: "Soft drinks, juices, and water", createdAt: new Date() },
    { name: "Snacks", slug: "snacks", description: "Chips, biscuits, and chocolates", createdAt: new Date() },
    { name: "Toiletries", slug: "toiletries", description: "Personal hygiene and soaps", createdAt: new Date() },
    { name: "Dairy", slug: "dairy", description: "Milk, cheese, and butter", createdAt: new Date() },
];

const products = [
    {
        title: "Coca Cola 500ml",
        sku: "BEV-001",
        category: "Beverages",
        costPrice: 35,
        sellingPrice: 45,
        stockQuantity: 40,
        lowStockThreshold: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        title: "Lays Classic Salted 50g",
        sku: "SNK-001",
        category: "Snacks",
        costPrice: 20,
        sellingPrice: 30,
        stockQuantity: 25,
        lowStockThreshold: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        title: "Dettol Soap Original 75g",
        sku: "TOI-001",
        category: "Toiletries",
        costPrice: 48,
        sellingPrice: 60,
        stockQuantity: 4, // Low stock test
        lowStockThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        title: "Aarong Dairy Liquid Milk 1L",
        sku: "DRY-001",
        category: "Dairy",
        costPrice: 80,
        sellingPrice: 95,
        stockQuantity: 15,
        lowStockThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        title: "KitKat 4 Finger Bar",
        sku: "SNK-002",
        category: "Snacks",
        costPrice: 65,
        sellingPrice: 85,
        stockQuantity: 0, // Out of stock test
        lowStockThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        title: "Pran Drinking Water 1.5L",
        sku: "BEV-002",
        category: "Beverages",
        costPrice: 22,
        sellingPrice: 30,
        stockQuantity: 50,
        lowStockThreshold: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

async function seedDatabase() {
    try {
        await client.connect();
        console.log("🔌 Connected to MongoDB for seeding...");

        const db = client.db();

        // কালেকশনগুলো খালি করা (ক্লিন স্লেট)
        await db.collection("categories").deleteMany({});
        await db.collection("products").deleteMany({});
        await db.collection("sales").deleteMany({});
        await db.collection("users").deleteMany({});

        console.log("🧹 Cleared existing categories, products, sales, and users.");

        // ১. ক্যাটাগরি ইনসার্ট
        await db.collection("categories").insertMany(categories);
        console.log(`✅ Inserted ${categories.length} categories.`);

        // ২. প্রোডাক্টস ইনসার্ট
        const insertedProducts = await db.collection("products").insertMany(products);
        console.log(`✅ Inserted ${products.length} products.`);

        const prodIds = insertedProducts.insertedIds;

        // ৩. রিয়ালিস্টিক সেলস ডেমো ডাটা তৈরি
        const sampleSales = [
            {
                invoiceNumber: "INV-100201",
                customerName: "Rahim Uddin",
                items: [
                    {
                        productId: prodIds[0],
                        title: "Coca Cola 500ml",
                        sku: "BEV-001",
                        price: 45,
                        quantity: 3,
                        total: 135,
                    },
                    {
                        productId: prodIds[1],
                        title: "Lays Classic Salted 50g",
                        sku: "SNK-001",
                        price: 30,
                        quantity: 2,
                        total: 60,
                    },
                ],
                subtotal: 195,
                discount: 10,
                total: 185,
                paymentMethod: "Cash",
                createdAt: new Date(),
            },
            {
                invoiceNumber: "INV-100202",
                customerName: "Walk-in Customer",
                items: [
                    {
                        productId: prodIds[0],
                        title: "Coca Cola 500ml",
                        sku: "BEV-001",
                        price: 45,
                        quantity: 4,
                        total: 180,
                    },
                    {
                        productId: prodIds[3],
                        title: "Aarong Dairy Liquid Milk 1L",
                        sku: "DRY-001",
                        price: 95,
                        quantity: 1,
                        total: 95,
                    },
                ],
                subtotal: 275,
                discount: 0,
                total: 275,
                paymentMethod: "Card",
                createdAt: new Date(),
            },
            {
                invoiceNumber: "INV-100203",
                customerName: "Tanvir Ahmed",
                items: [
                    {
                        productId: prodIds[5],
                        title: "Pran Drinking Water 1.5L",
                        sku: "BEV-002",
                        price: 30,
                        quantity: 5,
                        total: 150,
                    },
                ],
                subtotal: 150,
                discount: 0,
                total: 150,
                paymentMethod: "MFS",
                createdAt: new Date(),
            },
        ];

        await db.collection("sales").insertMany(sampleSales);
        console.log(`✅ Inserted ${sampleSales.length} demo sales orders.`);

        // ৪. ইউজার কালেকশন (Admin ও Cashier)
        const hashedPassword = await bcrypt.hash("123456", 10);

        const sampleUsers = [
            {
                name: "Sheikh Jim",
                email: "admin@swiftcounter.com",
                password: hashedPassword,
                role: "admin",
                createdAt: new Date(),
            },
            {
                name: "Terminal Cashier",
                email: "cashier@swiftcounter.com",
                password: hashedPassword,
                role: "cashier",
                createdAt: new Date(),
            },
        ];

        await db.collection("users").insertMany(sampleUsers);
        console.log(`✅ Inserted ${sampleUsers.length} initial users (Admin & Cashier).`);

        console.log("\n🚀 Database seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

seedDatabase();