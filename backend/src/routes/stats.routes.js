import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { statsRateLimiter } from "../middlewares/rateLimiter.middleware.js";
import { getOverview, getTrends } from "../controllers/stats.controller.js";

const router = express.Router();

// 🛡️ Stats con rate limiting (30 req/min)
router.get("/overview", protect, statsRateLimiter, getOverview);
router.get("/trends", protect, statsRateLimiter, getTrends);

export default router;
