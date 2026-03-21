import { useState, useEffect } from "react";
import { FiFilter, FiX, FiSearch } from "react-icons/fi";
import api from "../api/axios";

const defaultFilters = {
  status: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
  defective: "all",
  supplier: "all",
  tag: "all"
};

const DocumentFilters = ({ filters: parentFilters = defaultFilters, onFilterChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [tags, setTags] = useState([]);
  const filters = { ...defaultFilters, ...parentFilters };

  useEffect(() => {
    let cancelled = false;
    api.get("/suppliers?limit=200")
      .then((res) => {
        if (!cancelled) setSuppliers(res.data.suppliers || []);
      })
      .catch(() => {
        if (!cancelled) setSuppliers([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get("/tags?limit=200")
      .then((res) => {
        if (!cancelled) setTags(res.data.tags || []);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      });
    return () => { cancelled = true; };
  }, []);

  const loadSuppliers = () => {
    api.get("/suppliers?limit=200")
      .then((res) => setSuppliers(res.data.suppliers || []))
      .catch(() => setSuppliers([]));
  };

  // Unique value for Status: include "defective" as option
  const statusDisplayValue =
    filters.defective === "only" ? "defective" : filters.status;

  const handleStatusChange = (value) => {
    if (value === "defective") {
      onFilterChange({ ...filters, status: "all", defective: "only" });
    } else {
      onFilterChange({ ...filters, status: value, defective: "all" });
    }
  };

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    onReset();
  };

  const supplierOptions = suppliers.map((v) => (
    <option key={v.id} value={String(v.id)}>
      {v.name}
    </option>
  ));

  const hasActiveFilters =
    statusDisplayValue !== "all" ||
    (filters.supplier && filters.supplier !== "all") ||
    (filters.tag && filters.tag !== "all") ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-4 ${isOpen ? "w-full" : "w-fit ml-auto"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isOpen ? "mb-4" : ""}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-slate-700 font-medium hover:text-slate-900"
        >
          <FiFilter className="w-4 h-4" />
          Filters {hasActiveFilters && `(${[statusDisplayValue !== "all", filters.supplier && filters.supplier !== "all", filters.tag && filters.tag !== "all", filters.dateFrom, filters.dateTo, filters.search].filter(Boolean).length})`}
        </button>

        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close filters"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
          {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
          )}
        </div>
      </div>

      {/* Filters Form */}
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-200">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleChange("search", e.target.value)}
                placeholder="File name..."
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Supplier
            </label>
            <select
              value={String(filters.supplier || "all")}
              onChange={(e) => handleChange("supplier", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All</option>
              {supplierOptions}
              {suppliers.length === 0 && (
                <option value="none" disabled>No suppliers yet</option>
              )}
            </select>
            {suppliers.length === 0 && (
              <button
                type="button"
                onClick={loadSuppliers}
                className="mt-1 text-xs text-emerald-600 hover:text-emerald-700"
              >
                Load suppliers
              </button>
            )}
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tag
            </label>
            <select
              value={String(filters.tag || "all")}
              onChange={(e) => handleChange("tag", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All</option>
              {tags.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status (include Defective) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={statusDisplayValue}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
              <option value="defective">Defective</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFilters;
