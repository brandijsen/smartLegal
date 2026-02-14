import { StatsModel } from "../models/stats.model.js";

/**
 * GET /api/stats/overview
 * Restituisce statistiche generali
 */
export const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await StatsModel.getOverview(userId);
    res.json(stats);
  } catch (err) {
    console.error("Get overview stats failed:", err);
    res.status(500).json({ message: "Failed to get statistics" });
  }
};

/**
 * GET /api/stats/trends
 * Restituisce trend di upload e distribuzione tipi
 */
export const getTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const [uploadTrend, typeDistribution] = await Promise.all([
      StatsModel.getUploadTrend(userId, days),
      StatsModel.getDocumentTypeDistribution(userId),
    ]);

    res.json({
      uploadTrend,
      typeDistribution,
    });
  } catch (err) {
    console.error("Get trends failed:", err);
    res.status(500).json({ message: "Failed to get trends" });
  }
};
