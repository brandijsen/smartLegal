import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { extractTextFromPdf } from "../services/pdfExtractor.service.js";
import { parseDocument } from "../services/documentParser.service.js";
import { extractSemanticData } from "../services/aiSemanticParser.service.js";
import { classifyDocument } from "../services/documentClassifier.service.js";

console.log("🟡 Document worker avviato...");

new Worker(
  "document-processing",
  async (job) => {
    const { documentId } = job.data;

    try {
      await DocumentModel.updateStatus(documentId, "processing");

      const document = await DocumentModel.findByIdForWorker(documentId);

      // 1️⃣ RAW TEXT
      const rawText = await extractTextFromPdf(
        document.user_id,
        document.stored_name
      );

      await DocumentResultModel.upsertRawText(documentId, rawText);

      // 2️⃣ CLASSIFICATION
      const { document_type, document_subtype } =
        await classifyDocument(rawText);

      // 3️⃣ CONDITIONAL PARSING
      let semantic = null;

      if (document_type === "invoice") {
        const regexData = parseDocument(rawText);

        semantic = await extractSemanticData({
          rawText,
          regexData,
          document_subtype,
        });
      }

      // 4️⃣ FINAL JSON
      const finalJson = {
        document_type,
        document_subtype,
        semantic,
      };

      await DocumentResultModel.updateParsedJson(documentId, finalJson);

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
