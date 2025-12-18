import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadPDF } from "../middlewares/upload.middleware.js";
import {
  uploadDocument,
  getUserDocuments,
  getDocumentById, retryDocument, deleteDocument
} from "../controllers/document.controller.js";

const router = express.Router();

router.get("/", protect, getUserDocuments);
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
