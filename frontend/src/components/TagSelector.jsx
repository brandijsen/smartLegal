import { useState } from "react";
import { FiTag } from "react-icons/fi";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";

const TagSelector = ({ documentId, documentTags = [], onTagsChange }) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const hasPaid = documentTags.some((t) => t.name === "Paid");

  const handleMarkAsPaid = async () => {
    if (hasPaid) return;
    setLoading(true);
    try {
      const res = await api.get("/tags?limit=100");
      const tags = res.data.tags || [];
      const paid = tags.find((t) => t.name === "Paid");
      if (!paid) {
        showToast("Paid tag not available");
        return;
      }
      await api.patch(`/documents/${documentId}/tags`, { tag_ids: [paid.id] });
      onTagsChange?.([{ id: paid.id, name: "Paid", color: paid.color || "#22c55e" }]);
    } catch {
      showToast("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FiTag size={16} className="text-slate-500" />
        <span className="font-medium text-slate-900">Due status</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {documentTags.length === 0 ? (
          <span className="text-sm text-slate-500">Over 60 days until due</span>
        ) : (
          documentTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: tag.color || "#94a3b8" }}
            >
              {tag.name}
            </span>
          ))
        )}
        {!hasPaid && (
          <button
            onClick={handleMarkAsPaid}
            disabled={loading}
            className="ml-2 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
          >
            {loading ? "..." : "Mark as paid"}
          </button>
        )}
      </div>
    </div>
  );
};

export default TagSelector;
