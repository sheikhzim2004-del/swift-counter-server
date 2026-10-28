import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToMongoDB, disconnectFromMongoDB } from "./db.js";
import productRoutes from "./routes/productRoutes.js"; // <-- Import product routes 
import categoryRoutes from "./routes/categoryRoutes.js";
import saleRoutes from "./routes/saleRoutes.js"; // <-- Import sales routes
import analyticsRoutes from "./routes/analyticsRoutes.js"; // <-- Import analytics routes
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

//Api endpoints
app.use("/api/products", productRoutes); // <-- Mount product endpoint
app.use("/api/categories", categoryRoutes); // <-- Mount category endpoint
app.use("/api/sales", saleRoutes); // <-- Mount sales endpoint
app.use("/api/analytics", analyticsRoutes); // <-- Mount analytics endpoint
app.use("/api/auth", authRoutes); // <-- Mount auth endpoint


app.get("/api", (req, res) => {
  res.send({ message: "Welcome to Swift Counter API!" })
})





// Connect to MongoDB
connectToMongoDB()
  .then(() => {
    // Start the server after successful MongoDB connection     
    app.listen(PORT, (err) => {
      if (err) {
        console.error("Listen failed:", err);
        process.exit(1);
      }
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
