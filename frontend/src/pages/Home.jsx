import { useState } from "react";
import AuthModal from "../components/AuthModal";
import {
  FiUploadCloud,
  FiCpu,
  FiDownload,
  FiCheckCircle
} from "react-icons/fi";

const Home = () => {
  const [openAuth, setOpenAuth] = useState(false);

  return (
    <>
      <AuthModal isOpen={openAuth} onClose={() => setOpenAuth(false)} />

      {/* HERO — FULL WIDTH, NO GRAY GAP UNDER NAVBAR */}
      <section className="pt-40 pb-28 bg-white w-full">
        <div className="w-full px-10 text-center">
          <h1 className="text-5xl font-extrabold text-slate-900 max-w-4xl mx-auto">
            PDF → Structured data. Automatically.
          </h1>

          <p className="mt-6 text-lg text-slate-700 max-w-3xl mx-auto">
            Upload invoices and documents. Extract dates, amounts, VAT numbers
            and references in seconds. Ready for CSV exports and integrations.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <button
              onClick={() => setOpenAuth(true)}
              className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Get started
            </button>
            <button className="px-8 py-3 rounded-lg bg-white text-slate-900 font-semibold border border-slate-300 hover:bg-slate-50">
              View demo
            </button>
          </div>

          {/* FEATURE BLOCK — FULL WIDTH */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
      <section className="py-24 bg-[#F5F7FA] w-full">
        <div className="max-w-6xl mx-auto px-10 grid md:grid-cols-2 gap-10">
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
