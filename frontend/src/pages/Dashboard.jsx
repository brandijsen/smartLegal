import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import {
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiAlertTriangle,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_META = {
  done: { label: "Processed", className: "bg-emerald-100 text-emerald-700" },
  processing: { label: "Processing", className: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

const Dashboard = () => {
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
        const msg = err.response?.data?.message || err.message || "Errore nel caricamento statistiche";
        const status = err.response?.status;
        setError(status === 401 ? "Sessione scaduta. Effettua nuovamente l'accesso." : msg);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="pt-24 sm:pt-32 pb-24 min-h-screen bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-slate-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-24 sm:pt-32 pb-24 min-h-screen bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
            <p className="font-medium">Impossibile caricare la dashboard</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-3 text-amber-600">
              Verifica che il backend sia in esecuzione (porta 5000) e che MySQL sia attivo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const TYPE_SUBTYPE_LABELS = {
    "invoice_standard": "Standard invoice",
    "invoice_professional_fee": "Professional fee",
    "invoice_tax_exempt": "Tax exempt",
    "invoice_reverse_charge": "Reverse charge",
    "invoice": "Invoice",
    "receipt": "Receipt",
    "credit_note": "Credit note",
    "other": "Other",
  };
  const TYPE_COLORS = [
    "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16", "#94a3b8",
  ];
  const typeDistribution = trends?.typeDistribution || [];
  const typeData = typeDistribution
    .filter((r) => (r.doc_type || r.doc_subtype || "other") && Number(r.count) > 0)
    .map((r, i) => {
      const key = r.doc_subtype
        ? `${r.doc_type || "other"}_${r.doc_subtype}`
        : (r.doc_type || "other");
      return {
        name: TYPE_SUBTYPE_LABELS[key] || TYPE_SUBTYPE_LABELS[r.doc_type] || r.doc_subtype || r.doc_type || "Altro",
        value: Number(r.count),
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      };
    });

  const SCADENZA_LABELS = {
    "60 days": "60 days",
    "30 days": "30 days",
    "10 days": "10 giorni",
    "1 day": "1 giorno",
    "Due today": "Scade oggi",
    "Overdue": "Scaduto",
  };
  const scadenzaData = (trends?.scadenzaDistribution || [])
    .filter((r) => Number(r.count) > 0)
    .map((r) => ({
      name: SCADENZA_LABELS[r.name] || r.name,
      count: Number(r.count),
      fill: r.color || "#94a3b8",
    }));

  // Dati per spesa nel tempo (line) - aggregato per MESE (es. Feb 2026)
  const spendingTrend = trends?.spendingTrend || [];
  const spendingData = spendingTrend
    .filter((row) => row?.month)
    .map((row) => {
      const { month, ...amounts } = row;
      const monthLabel =
        month && month.length >= 7
          ? new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : month || "";
      const numericAmounts = {};
      for (const [k, v] of Object.entries(amounts)) {
        if (k && v != null) numericAmounts[k] = Number(v) || 0;
      }
      return { month: monthLabel, ...numericAmounts };
    });
  const currencyKeys =
    spendingData.length > 0
      ? Object.keys(spendingData[0]).filter((k) => k !== "month" && k !== "")
      : [];

  // Dati per line chart upload trend
  const uploadData =
    trends?.uploadTrend?.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: item.count,
    })) || [];

  // Totale importi
  const totalAmounts = overview?.amounts || {};
  const amountDisplay = Object.entries(totalAmounts)
    .filter(([, amount]) => amount != null)
    .map(
      ([currency, amount]) =>
        `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    )
    .join(" • ");

  return (
    <div className="pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-24 min-h-screen bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Overview of your documents and statistics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Documents</p>
                <p className="text-3xl font-bold text-slate-900">
                  {overview?.documents?.total ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FiFileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Processed</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {overview?.documents?.done ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Failed</p>
                <p className="text-3xl font-bold text-amber-600">
                  {overview?.documents?.failed ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Defective</p>
                <p className="text-3xl font-bold text-red-600">
                  {overview?.defective ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 1: Ultimi caricamenti + Tipo fattura */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ultimi caricamenti */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiClock className="w-5 h-5" />
              Ultimi caricamenti
            </h2>
            {latestDocuments.length > 0 ? (
              <ul className="space-y-2">
                {latestDocuments.map((doc) => {
                  const meta = STATUS_META[doc.status] || STATUS_META.pending;
                  return (
                    <li key={doc.id}>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-slate-50 text-slate-800"
                      >
                        <span className="truncate font-medium text-emerald-600 hover:underline">
                          {doc.original_name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(doc.uploaded_at).toLocaleDateString("it-IT")}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500">
                Nessun documento caricato
              </div>
            )}
          </div>

          {/* Tipo documento (pie) */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Tipo di documento
            </h2>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} className="[&_*]:outline-none">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={90}
                    dataKey="value"
                    activeShape={false}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-500">
                Nessun dato disponibile
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Scadenze imminenti + Spesa nel tempo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scadenze imminenti */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Scadenze imminenti
            </h2>
            {scadenzaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} className="[&_*]:outline-none">
                <BarChart data={scadenzaData} layout="vertical" margin={{ left: 20, right: 8 }} cursor={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={28} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={false} />
                  <Bar dataKey="count" name="Documenti" radius={[0, 4, 4, 0]} activeBar={false}>
                    {scadenzaData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-500">
                Nessun documento con scadenza nei prossimi 60 giorni
              </div>
            )}
          </div>

          {/* Spesa nel tempo */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <FiDollarSign className="w-5 h-5" />
              Spending over time (last 90 days)
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Total amount per month. Each point = one month (e.g. Feb 2026). Each line = one currency (EUR, GBP, USD).
            </p>
            {spendingData.length > 0 && currencyKeys.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} className="[&_*]:outline-none">
                <LineChart data={spendingData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} cursor={false}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(v) => (typeof v === "number" ? v.toLocaleString("it-IT") : v)}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value) =>
                      typeof value === "number"
                        ? value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : value
                    }
                  />
                  <Legend />
                  {currencyKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={["#10b981", "#3b82f6", "#f59e0b"][i % 3]}
                      strokeWidth={2}
                      name={key}
                      dot={{ r: 4 }}
                      activeDot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-500">
                Nessun dato di spesa
              </div>
            )}
          </div>
        </div>

        {/* Upload Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FiTrendingUp className="w-5 h-5" />
            Upload trend (ultimi 30 giorni)
          </h2>
          {uploadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280} className="[&_*]:outline-none">
              <LineChart data={uploadData} cursor={false}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip cursor={false} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Documenti"
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500">
              Nessun upload negli ultimi 30 giorni
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-linear-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-emerald-900 mb-2">
            Quick Actions
          </h2>
          <p className="text-sm text-emerald-700 mb-4">
            Ready to manage your documents?
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              to="/documents"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              View All Documents
            </Link>
            <Link
              to="/documents"
              className="px-4 py-2 bg-white text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-50 border border-emerald-200 transition-colors"
            >
              Upload New PDF
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
