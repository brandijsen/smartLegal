import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import {
  FiUploadCloud,
  FiCpu,
  FiDownload,
  FiCheckCircle,
  FiBarChart2,
  FiFileText,
  FiArrowRight
} from "react-icons/fi";

const Home = () => {
  const [openAuth, setOpenAuth] = useState(false);
  const { user } = useSelector((state) => state.auth);

  // Se l'utente è loggato, mostra versione personalizzata
  if (user) {
    return (
      <>
        {/* HERO LOGGED IN */}
        <section className="pt-24 sm:pt-32 lg:pt-40 pb-16 sm:pb-24 lg:pb-28 bg-white w-full">
          <div className="w-full px-4 sm:px-6 lg:px-10 text-center">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 max-w-4xl mx-auto">
              Welcome back, {user.name}! 👋
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-700 max-w-3xl mx-auto px-1">
              Ready to manage your documents? Access your dashboard or upload new PDFs.
            </p>

            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                to="/dashboard"
                className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-2"
              >
                <FiBarChart2 />
                Go to Dashboard
              </Link>
              <Link
                to="/documents"
                className="px-8 py-3 rounded-lg bg-white text-slate-900 font-semibold border border-slate-300 hover:bg-slate-50 flex items-center gap-2"
              >
                <FiFileText />
                View Documents
              </Link>
            </div>

            {/* QUICK STATS CARDS */}
            <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
              <Link
                to="/dashboard"
                className="bg-linear-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6 text-left border border-emerald-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-emerald-900">
                      <FiBarChart2 /> Dashboard
                    </div>
                    <p className="text-sm text-emerald-700 mt-2">
                      View statistics and analytics
                    </p>
                  </div>
                  <FiArrowRight className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/documents"
                className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 text-left border border-blue-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-blue-900">
                      <FiFileText /> Documents
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      Manage and upload PDFs
                    </p>
                  </div>
                  <FiArrowRight className="text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                to="/documents"
                className="bg-linear-to-br from-violet-50 to-violet-100 rounded-xl shadow-sm p-6 text-left border border-violet-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-violet-900">
                      <FiUploadCloud /> Upload
                    </div>
                    <p className="text-sm text-violet-700 mt-2">
                      Add new documents
                    </p>
                  </div>
                  <FiArrowRight className="text-violet-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section className="py-12 sm:py-16 lg:py-24 bg-[#F5F7FA] w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 text-center mb-8 sm:mb-12">
              Why use InvParser?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
              {[
                "Save hours of manual data entry",
                "Reduce human errors",
                "Centralize your documents",
                "GDPR-compliant by design"
              ].map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-slate-800 bg-white rounded-lg p-6 shadow-sm"
                >
                  <FiCheckCircle className="text-emerald-600 shrink-0" />
                  <span className="text-lg">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  // Versione pubblic (utente NON loggato)
  return (
    <>
      <AuthModal isOpen={openAuth} onClose={() => setOpenAuth(false)} />

      {/* HERO — FULL WIDTH, NO GRAY GAP UNDER NAVBAR */}
      <section className="pt-24 sm:pt-32 lg:pt-40 pb-16 sm:pb-24 lg:pb-28 bg-white w-full">
        <div className="w-full px-4 sm:px-6 lg:px-10 text-center">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 max-w-4xl mx-auto">
            PDF → Structured data. Automatically.
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-700 max-w-3xl mx-auto px-1">
            Upload invoices and documents. Extract dates, amounts, VAT numbers
            and references in seconds. Ready for CSV exports and integrations.
          </p>

          <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setOpenAuth(true)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Get started
            </button>
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg bg-white text-slate-900 font-semibold border border-slate-300 hover:bg-slate-50">
              View demo
            </button>
          </div>

          {/* FEATURE BLOCK — FULL WIDTH */}
          <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow p-6 text-left">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <FiUploadCloud /> Upload
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Securely upload PDF documents from your dashboard.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 text-left">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <FiCpu /> Processing
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Automatic parsing using regex and AI.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 text-left">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <FiDownload /> Export
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Export structured data as JSON or CSV, ready to use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — NO SIDE GAPS */}
      <section className="py-12 sm:py-16 lg:py-24 bg-[#F5F7FA] w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
          {[
            "Save hours of manual data entry",
            "Reduce human errors",
            "Centralize your documents",
            "GDPR-compliant by design"
          ].map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-slate-800 bg-white rounded-lg p-6 shadow-sm"
            >
              <FiCheckCircle className="text-emerald-600" />
              <span className="text-lg">{t}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
