import { useEffect, useState } from "react";
import api from "../api/axios";
import { 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle, 
  FiTrendingUp,
  FiAlertTriangle
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  done: "#10b981",
  processing: "#f59e0b",
  pending: "#6b7280",
  failed: "#ef4444",
};

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [overviewRes, trendsRes] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/stats/trends"),
        ]);
        setOverview(overviewRes.data);
        setTrends(trendsRes.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-slate-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Prepara dati per pie chart (status distribution)
  const statusData = overview?.documents
    ? [
        { name: "Done", value: overview.documents.done, color: COLORS.done },
        { name: "Processing", value: overview.documents.processing, color: COLORS.processing },
        { name: "Pending", value: overview.documents.pending, color: COLORS.pending },
        { name: "Failed", value: overview.documents.failed, color: COLORS.failed },
      ].filter((item) => item.value > 0)
    : [];

  // Prepara dati per line chart (upload trend)
  const uploadData = trends?.uploadTrend?.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: item.count,
  })) || [];

  // Totale importi
  const totalAmounts = overview?.amounts || {};
  const amountDisplay = Object.entries(totalAmounts)
    .filter(([, amount]) => amount != null) // Fix: skip null amounts
    .map(([currency, amount]) => `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(" • ");

  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Overview of your documents and statistics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Documents */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Documents</p>
                <p className="text-3xl font-bold text-slate-900">
                  {overview?.documents?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FiFileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Done */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Processed</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {overview?.documents?.done || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Failed</p>
                <p className="text-3xl font-bold text-amber-600">
                  {overview?.documents?.failed || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Defective */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Defective</p>
                <p className="text-3xl font-bold text-red-600">
                  {overview?.defective || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Documents by Status
            </h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </div>

          {/* Upload Trend */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Upload Trend (Last 30 Days)
            </h2>
            {uploadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uploadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Documents"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-linear-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-6">
          <h2 className="text-lg font-semibold text-emerald-900 mb-2">
            Quick Actions
          </h2>
          <p className="text-sm text-emerald-700 mb-4">
            Ready to manage your documents?
          </p>
          <div className="flex gap-3">
            <a
              href="/documents"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              View All Documents
            </a>
            <a
              href="/documents"
              className="px-4 py-2 bg-white text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-50 border border-emerald-200 transition-colors"
            >
              Upload New PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
