import { useEffect, useState } from "react";
import api from "../api/axios";

/**
 * Loads overview, trends, and latest documents for the dashboard.
 */
export function useDashboardData() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setError(null);
      try {
        const [overviewRes, trendsRes, docsRes] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/stats/trends"),
          api.get("/documents?limit=5&page=1").catch(() => ({ data: { documents: [] } })),
        ]);
        setOverview(overviewRes.data);
        setTrends(trendsRes.data);
        const docs = docsRes?.data?.documents || trendsRes?.data?.latestDocuments || [];
        setLatestDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        const msg = err.response?.data?.message || err.message || "Error loading statistics";
        const status = err.response?.status;
        setError(status === 401 ? "Session expired. Please log in again." : msg);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { overview, trends, latestDocuments, loading, error };
}
