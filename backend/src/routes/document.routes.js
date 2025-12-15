import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadPDF } from "../middlewares/upload.middleware.js";
import {
  uploadDocument,
  getUserDocuments,
  getDocumentById 
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

export default router;
