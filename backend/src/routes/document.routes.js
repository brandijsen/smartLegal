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
  exportDocumentsCSV,
  exportDocumentsExcel
} from "../controllers/document.controller.js";

const router = express.Router();

router.get("/", protect, getUserDocuments);

// Export routes (prima delle route parametriche)
router.get("/export/csv", protect, exportDocumentsCSV);
router.get("/export/excel", protect, exportDocumentsExcel);

router.get("/:id", protect, getDocumentById);

router.post(
  "/upload",
  protect,
  uploadPDF.single("file"),
  uploadDocument
);

router.post("/:id/retry", protect, retryDocument);

router.delete("/:id", protect, deleteDocument);

router.get("/:id/result", protect, getDocumentResult);
router.get("/:id/raw", protect, getDocumentRaw);

export default router;
