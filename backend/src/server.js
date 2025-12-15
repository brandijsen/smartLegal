import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";

dotenv.config();

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// Test DB
pool.execute("SELECT 1")
  .then(() => console.log("🟢 MySQL connected"))
  .catch(err => console.error("🔴 MySQL error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("BASE_URL:", process.env.BASE_URL);
  console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
});
