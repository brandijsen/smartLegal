import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { extractTextFromPdf } from "../services/pdfExtractor.service.js";

console.log("🟡 Document worker avviato...");

new Worker(
  "document-processing",
  async job => {
    const { documentId } = job.data;

    try {
      await DocumentModel.updateStatus(documentId, "processing");

      const document = await DocumentModel.findByIdForWorker(documentId);

      const rawText = await extractTextFromPdf(
        document.user_id,
        document.stored_name
      );

      await DocumentResultModel.create({
        documentId,
        rawText,
      });

      await DocumentModel.updateStatus(documentId, "done");

      console.log("✅ Documento processato:", documentId);
    } catch (err) {
      console.error("❌ Errore processing:", err);
      await DocumentModel.updateStatus(documentId, "failed");
      throw err;
    }
  },
  { connection: redisConnection }
);

