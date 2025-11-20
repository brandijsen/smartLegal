import express from "express";
import dotenv from "dotenv";
import { getPool } from "./config/db.js";

dotenv.config();

const app = express();
app.use(express.json());

// Test connessione DB
(async () => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    console.log("🟢 Connessione MySQL OK");
  } catch (err) {
    console.error("🔴 Errore connessione MySQL:", err);
  }
})();

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 5000);
});
