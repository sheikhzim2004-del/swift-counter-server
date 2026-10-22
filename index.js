import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToMongoDB, disconnectFromMongoDB } from "./db.js";
import productRoutes from "./routes/productRoutes.js"; // <-- Import product routes 
import categoryRoutes from "./routes/categoryRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//Api endpoints
app.use("/api/products", productRoutes); // <-- Mount product endpoint
app.use("/api/categories", categoryRoutes); // <-- Mount category endpoint


app.get("/api", (req, res)=> {
    res.send({message: "Welcome to Swift Counter API!"})
})





// Connect to MongoDB
connectToMongoDB()
  .then(() => {
    // Start the server after successful MongoDB connection     
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
