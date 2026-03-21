import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { FiSearch, FiX, FiBriefcase, FiFileText } from "react-icons/fi";
import PageLoader from "../components/PageLoader";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "200" });
      if (search.trim()) params.append("search", search.trim());
      const res = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(res.data.suppliers || []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchSuppliers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const openDetail = (supplier) => {
    setSelectedSupplier(supplier);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedSupplier(null);
  };

  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-24 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FiBriefcase className="text-emerald-600" />
            Suppliers
          </h1>
          <p className="text-slate-600 mt-1">
            Supplier registry. Linked automatically when invoices are processed.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, VAT, address or email..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <PageLoader message="Loading suppliers…" variant="inline" />
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FiBriefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No suppliers yet.</p>
              <p className="text-sm mt-2">
                They will appear here when documents are processed.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <li key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors group">
                  <button
                    type="button"
                    onClick={() => openDetail(s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-slate-900 truncate group-hover:text-emerald-600">{s.name}</p>
                    {s.vat_number && (
                      <p className="text-sm text-slate-500">VAT: {s.vat_number}</p>
                    )}
                    {s.address && (
                      <p className="text-sm text-slate-500 truncate">{s.address}</p>
                    )}
                  </button>
                  <Link
                    to={`/documents?supplier=${s.id}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
                  >
                    View docs
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal View Supplier Details */}
      {detailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FiBriefcase className="text-emerald-600" />
                {selectedSupplier.name}
              </h2>
              <button onClick={closeDetailModal} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedSupplier.vat_number && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">VAT number</dt>
                  <dd className="mt-1 text-slate-900">{selectedSupplier.vat_number}</dd>
                </div>
              )}
              {selectedSupplier.address && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">Address</dt>
                  <dd className="mt-1 text-slate-900 whitespace-pre-wrap">{selectedSupplier.address}</dd>
                </div>
              )}
              {selectedSupplier.email && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">Email</dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${selectedSupplier.email}`}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      {selectedSupplier.email}
                    </a>
                  </dd>
                </div>
              )}
              {!selectedSupplier.vat_number && !selectedSupplier.address && !selectedSupplier.email && (
                <p className="text-slate-500 text-sm">No additional details available.</p>
              )}
            </div>
            <div className="p-6 pt-0">
              <Link
                to={`/documents?supplier=${selectedSupplier.id}`}
                onClick={closeDetailModal}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                <FiFileText size={18} />
                View invoices
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
