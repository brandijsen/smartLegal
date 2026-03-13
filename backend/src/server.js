import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import emailRoutes from "./routes/email.routes.js";
import "./config/redis.js";
import { documentQueue } from "./queues/documentQueue.js";
import "./queues/documentWorker.js";
import { syncScadenzaForAllDocuments } from "./services/scadenzaTags.service.js";
import cookieParser from "cookie-parser";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware.js";
import { validateEnvOrExit } from "./utils/envValidator.js";
import logger from "./utils/logger.js";
import { requestLogger, errorHandler } from "./middlewares/logger.middleware.js";

dotenv.config();

// 🔍 Valida variabili d'ambiente PRIMA di avviare il server
validateEnvOrExit();

const app = express();
app.use(cookieParser());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// 📊 Request Logging (PRIMA di tutto per tracciare ogni richiesta)
app.use(requestLogger);

// 🛡️ Rate Limiting Globale (salta in development per evitare 429 durante test)
if (process.env.NODE_ENV === "production") {
  app.use(globalRateLimiter);
}

// Test DB
pool.execute("SELECT 1")
  .then(() => logger.info("MySQL connected successfully"))
  .catch(err => {
    logger.error("MySQL connection failed", { 
      error: err.message, 
      stack: err.stack 
    });
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/email", emailRoutes);

// ❌ Error Handler Centralizzato (DEVE essere DOPO tutte le routes)
app.use(errorHandler);

// 🏷️ Sync periodico tag scadenza (ogni ora) – aggiorna 30/20/10/3/2/1/overdue
setInterval(async () => {
  try {
    const { updated } = await syncScadenzaForAllDocuments();
    if (updated > 0) {
      logger.info("Scadenza tags synced", { documentsUpdated: updated });
    }
  } catch (err) {
    logger.error("Scadenza tags sync failed", {
      error: err?.message,
      stack: err?.stack
    });
  }
}, 60 * 60 * 1000);

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  logger.info("Server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    baseUrl: process.env.BASE_URL,
    frontendUrl: process.env.FRONTEND_URL,
    features: {
      rateLimiting: true,
      requestLogging: true,
      errorHandling: true
    }
  });
  // Sync scadenza tags all'avvio (corregge tag dopo restart)
  try {
    const { updated } = await syncScadenzaForAllDocuments();
    if (updated > 0) {
      logger.info("Scadenza tags synced at startup", { documentsUpdated: updated });
    }
  } catch (err) {
    logger.warn("Startup scadenza sync failed", { error: err?.message });
  }
});
