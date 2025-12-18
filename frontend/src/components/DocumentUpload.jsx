import { useRef, useState } from "react";
import api from "../api/axios";

const DocumentUpload = ({ onUploaded }) => {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onUploaded?.(); // refresh lista
    } catch (err) {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={onInputChange}
      />

      <p className="text-slate-700 mb-4">
        Drag & drop a PDF here, or
      </p>

      <button
        onClick={() => inputRef.current.click()}
        disabled={loading}
        className="px-6 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Uploading…" : "Select PDF"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default DocumentUpload;
