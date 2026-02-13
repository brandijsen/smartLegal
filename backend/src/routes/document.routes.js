import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadPDF } from "../middlewares/upload.middleware.js";
import {
  uploadDocument,
  getUserDocuments,
  getDocumentById,
  retryDocument,
  deleteDocument,
  getDocumentResult,
  getDocumentRaw,
  downloadDocument,
  exportDocumentsCSV,
  exportDocumentsExcel
} from "../controllers/document.controller.js";

const router = express.Router();

router.get("/", protect, getUserDocuments);

// Export routes (prima delle route parametriche)
router.get("/export/csv", protect, exportDocumentsCSV);
router.get("/export/excel", protect, exportDocumentsExcel);

// Download route (PRIMA di /:id)
router.get("/:id/download", protect, downloadDocument);
router.get("/:id/result", protect, getDocumentResult);
router.get("/:id/raw", protect, getDocumentRaw);

// Route parametrica generica (DOPO le route specifiche)
router.get("/:id", protect, getDocumentById);

router.post(
  "/upload",
  protect,
  uploadPDF.single("file"),
  uploadDocument
);

router.post("/:id/retry", protect, retryDocument);

router.delete("/:id", protect, deleteDocument);

export default router;
