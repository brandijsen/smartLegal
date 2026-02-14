import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { extractTextFromPdf } from "../services/pdfExtractor.service.js";
import { parseDocument } from "../services/documentParser.service.js";
import { extractSemanticData } from "../services/aiSemanticParser.service.js";
import { classifyDocument } from "../services/documentClassifier.service.js";
import { validateExtractedData } from "../services/validationRules.service.js";
import { markDocumentComplete } from "../services/batchNotification.service.js";
import logger, { logJob, logError, logValidation } from "../utils/logger.js";

logger.info("Document worker started");

new Worker(
  "document-processing",
  async (job) => {
    const { documentId } = job.data;
    const jobContext = { jobId: job.id, documentId };

    logJob("document-processing", "started", jobContext);

    try {
      await DocumentModel.updateStatus(documentId, "processing");

      const document = await DocumentModel.findByIdForWorker(documentId);

      logJob("document-processing", "extracting_text", { 
        ...jobContext, 
        userId: document.user_id,
        fileName: document.original_name 
      });

      // 1️⃣ RAW TEXT
      const rawText = await extractTextFromPdf(
        document.user_id,
        document.stored_name
      );

      await DocumentResultModel.upsertRawText(documentId, rawText);

      logger.debug("Raw text extracted", { 
        ...jobContext, 
        textLength: rawText.length 
      });

      // 2️⃣ CLASSIFICATION
      logJob("document-processing", "classifying", jobContext);
      
      const { document_type, document_subtype } =
        await classifyDocument(rawText);

      logger.info("Document classified", { 
        ...jobContext, 
        document_type, 
        document_subtype 
      });

      // 3️⃣ CONDITIONAL PARSING
      let semantic = null;
      let validationResult = { isValid: true, flags: [], validatedData: semantic };

      if (document_type === "invoice") {
        logJob("document-processing", "parsing_invoice", { 
          ...jobContext, 
          document_subtype 
        });

        const regexData = parseDocument(rawText);

        semantic = await extractSemanticData({
          rawText,
          regexData,
          document_subtype,
        });

        // 4️⃣ VALIDATION RULES (controllo consistenza matematica)
        validationResult = validateExtractedData(semantic, document_subtype);
        
        // Log validation flags se presenti
        if (validationResult.flags.length > 0) {
          logValidation(documentId, validationResult.flags, {
            document_subtype,
            userId: document.user_id
          });
        }
      } else {
        // 🚨 Documento NON è una fattura - aggiungi flag critico
        logger.warn("Document is not an invoice", { 
          ...jobContext, 
          document_type,
          userId: document.user_id 
        });
        
        validationResult.flags.push({
          field: 'document_type',
          severity: 'critical',
          message: `This document is not an invoice. Detected type: "${document_type}". Please upload only invoices.`,
          type: 'wrong_document_type',
          detected_type: document_type
        });
      }

      // 5️⃣ FINAL JSON (include validation flags)
      const finalJson = {
        document_type,
        document_subtype,
        semantic: validationResult.validatedData,
        validation_flags: validationResult.flags,
      };

      await DocumentResultModel.updateParsedJson(documentId, finalJson);

      await DocumentModel.updateStatus(documentId, "done");

      logJob("document-processing", "completed", { 
        ...jobContext,
        hasFlags: validationResult.flags.length > 0,
        flagCount: validationResult.flags.length
      });

      // 📧 Batch notification (raggruppa email per upload multipli)
      try {
        await markDocumentComplete(
          documentId,
          document.user_id,
          document.original_name,
          'done'
        );
      } catch (emailError) {
        // Non bloccare il processing se email fallisce
        logError(emailError, { 
          ...jobContext, 
          operation: "batch_notification",
          phase: "success_email"
        });
      }

    } catch (err) {
      logError(err, { 
        ...jobContext,
        operation: "document_processing",
        phase: "processing"
      });
      
      await DocumentModel.updateStatus(documentId, "failed");

      // 📧 Batch notification errore
      try {
        const document = await DocumentModel.findByIdForWorker(documentId);
        await markDocumentComplete(
          documentId,
          document.user_id,
          document.original_name,
          'failed',
          err.message
        );
      } catch (emailError) {
        // Non bloccare nemmeno se email errore fallisce
        logError(emailError, { 
          ...jobContext,
          operation: "batch_notification",
          phase: "error_email"
        });
      }

      logJob("document-processing", "failed", { 
        ...jobContext,
        error: err.message
      });

      throw err;
    }
  },
  { connection: redisConnection }
);
