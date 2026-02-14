import { useRef, useState } from "react";
import api from "../api/axios";
import { FiUploadCloud, FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";

const DocumentUpload = ({ onUploaded }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [error, setError] = useState("");

  const handleFiles = async (files) => {
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      setError("Only PDF files are allowed");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (pdfFiles.length !== files.length) {
      setError(`${files.length - pdfFiles.length} non-PDF file(s) skipped`);
      setTimeout(() => setError(""), 3000);
    }

    // Crea queue items con stato iniziale
    const queueItems = pdfFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "pending", // pending | uploading | success | error
      progress: 0,
      error: null,
    }));

    setUploadQueue((prev) => [...prev, ...queueItems]);

    // 🎯 BATCH UPLOAD: invia tutti i file insieme se multipli
    if (pdfFiles.length > 1) {
      await uploadBatchFiles(queueItems);
    } else {
      // Upload singolo (retrocompatibilità)
      await uploadSingleFile(queueItems[0]);
    }

    // Refresh lista documenti dopo tutti gli upload
    onUploaded?.();

    // Pulisci queue dopo 3 secondi
    setTimeout(() => {
      setUploadQueue((prev) =>
        prev.filter((q) => !queueItems.find((i) => i.id === q.id))
      );
    }, 3000);
  };

  // 🎯 NEW: Upload batch di file in una singola richiesta
  const uploadBatchFiles = async (queueItems) => {
    // Marca tutti come "uploading"
    setUploadQueue((prev) =>
      prev.map((q) =>
        queueItems.find((i) => i.id === q.id)
          ? { ...q, status: "uploading" }
          : q
      )
    );

    try {
      const formData = new FormData();
      
      // Aggiungi tutti i file al FormData
      queueItems.forEach((item) => {
        formData.append("files", item.file);
      });

      const response = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // Aggiorna progress per tutti i file nel batch
          setUploadQueue((prev) =>
            prev.map((q) =>
              queueItems.find((i) => i.id === q.id)
                ? { ...q, progress }
                : q
            )
          );
        },
      });

      // Tutti i file uploadati con successo
      setUploadQueue((prev) =>
        prev.map((q) =>
          queueItems.find((i) => i.id === q.id)
            ? { ...q, status: "success", progress: 100 }
            : q
        )
      );

      console.log("✅ Batch upload completato:", response.data);
    } catch (err) {
      // 🛡️ Gestione Rate Limit (429)
      if (err.response?.status === 429) {
        const errorData = err.response?.data;
        const retryAfter = errorData?.retryAfter || 30;
        const errorMsg = errorData?.message || `Upload limit reached. Please wait ${retryAfter} seconds.`;
        
        setError(errorMsg);
        
        // Marca tutti come errore con messaggio specifico
        setUploadQueue((prev) =>
          prev.map((q) =>
            queueItems.find((i) => i.id === q.id)
              ? { ...q, status: "error", error: `Rate limit: Wait ${retryAfter}s` }
              : q
          )
        );
        
        // Mantieni errore visibile per 5 secondi
        setTimeout(() => setError(""), 5000);
        
        console.error("🛡️ Rate limit exceeded:", errorMsg);
        return;
      }
      
      // Errore generico batch
      setUploadQueue((prev) =>
        prev.map((q) =>
          queueItems.find((i) => i.id === q.id)
            ? { ...q, status: "error", error: "Batch upload failed" }
            : q
        )
      );
      console.error("❌ Batch upload failed:", err);
    }
  };

  const uploadSingleFile = async (queueItem) => {
    // Aggiorna stato a "uploading"
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === queueItem.id ? { ...q, status: "uploading" } : q
      )
    );

    try {
      const formData = new FormData();
      formData.append("files", queueItem.file); // Usa "files" per coerenza con batch

      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueItem.id ? { ...q, progress } : q))
          );
        },
      });

      // Successo
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === queueItem.id
            ? { ...q, status: "success", progress: 100 }
            : q
        )
      );
    } catch (err) {
      // 🛡️ Gestione Rate Limit (429)
      if (err.response?.status === 429) {
        const errorData = err.response?.data;
        const retryAfter = errorData?.retryAfter || 30;
        const errorMsg = errorData?.message || `Upload limit reached. Please wait ${retryAfter} seconds.`;
        
        setError(errorMsg);
        
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueItem.id
              ? { ...q, status: "error", error: `Rate limit: Wait ${retryAfter}s` }
              : q
          )
        );
        
        // Mantieni errore visibile per 5 secondi
        setTimeout(() => setError(""), 5000);
        
        console.error("🛡️ Rate limit exceeded:", errorMsg);
        return;
      }
      
      // Errore generico
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === queueItem.id
            ? { ...q, status: "error", error: "Upload failed" }
            : q
        )
      );
    }
  };

  const onInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const isUploading = uploadQueue.some((q) => q.status === "uploading");

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={onInputChange}
        />

        <FiUploadCloud className="w-12 h-12 mx-auto mb-4 text-slate-400" />

        <p className="text-slate-700 mb-2 font-medium">
          {isDragging
            ? "Drop PDF files here"
            : "Drag & drop PDF files here, or"}
        </p>

        <button
          onClick={() => inputRef.current.click()}
          disabled={isUploading}
          className="px-6 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading…" : "Select PDFs"}
        </button>

        <p className="text-xs text-slate-500 mt-4">
          You can upload multiple PDFs at once
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>
        )}
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Upload Progress ({uploadQueue.filter((q) => q.status === "success").length}/{uploadQueue.length})
          </h3>

          {uploadQueue.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.status === "pending" && (
                    <FiLoader className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  {item.status === "uploading" && (
                    <FiLoader className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  )}
                  {item.status === "success" && (
                    <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {item.status === "error" && (
                    <FiXCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}

                  <span className="truncate text-slate-700">
                    {item.file.name}
                  </span>
                </div>

                <span className="text-xs text-slate-500 ml-2 shrink-0">
                  {item.status === "success" && "Done"}
                  {item.status === "error" && "Failed"}
                  {item.status === "uploading" && `${item.progress}%`}
                  {item.status === "pending" && "Waiting"}
                </span>
              </div>

              {/* Progress Bar */}
              {item.status === "uploading" && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.status === "error" && item.error && (
                <p className="text-xs text-red-600">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
