import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadPDF } from "../middlewares/upload.middleware.js";
import { uploadRateLimiter } from "../middlewares/rateLimiter.middleware.js";
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
  exportDocumentsExcel,
  updateDocumentResult,
  updateDocumentSupplier,
  bulkUnmarkDefective,
  markDocumentDefective,
  unmarkDocumentDefective,
  getDefectiveDocuments
} from "../controllers/document.controller.js";
import { getDocumentTags, setDocumentTags } from "../controllers/tag.controller.js";

const router = express.Router();

router.get("/", protect, getUserDocuments);

// Export routes (prima delle route parametriche)
router.get("/export/csv", protect, exportDocumentsCSV);
router.get("/export/excel", protect, exportDocumentsExcel);

// Defective documents
router.get("/defective/list", protect, getDefectiveDocuments);
router.post("/bulk-unmark-defective", protect, bulkUnmarkDefective);

// Download route (PRIMA di /:id)
router.get("/:id/download", protect, downloadDocument);
router.get("/:id/result", protect, getDocumentResult);
router.get("/:id/raw", protect, getDocumentRaw);
router.get("/:id/tags", protect, getDocumentTags);
router.patch("/:id/tags", protect, setDocumentTags);
// Route parametrica generica (DOPO le route specifiche)
router.get("/:id", protect, getDocumentById);

// 🛡️ Upload con rate limiting giornaliero (50/day)
router.post(
  "/upload",
  protect,
  uploadRateLimiter,
  uploadPDF.array("files", 20), // Max 20 file per volta
  uploadDocument
);

router.post("/:id/retry", protect, retryDocument);
router.post("/:id/mark-defective", protect, markDocumentDefective);
router.post("/:id/unmark-defective", protect, unmarkDocumentDefective);

router.patch("/:id/result", protect, updateDocumentResult);
router.patch("/:id/supplier", protect, updateDocumentSupplier);

router.delete("/:id", protect, deleteDocument);

export default router;
