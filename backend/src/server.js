import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

// Test DB connection
pool.execute("SELECT 1")
  .then(() => console.log("🟢 MySQL connected"))
  .catch(err => console.error("🔴 MySQL error:", err));

app.use("/auth", authRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);

});
