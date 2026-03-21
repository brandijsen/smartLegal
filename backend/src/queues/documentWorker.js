import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { parseDocument } from "../services/documentParser.service.js";
import { extractSemanticData } from "../services/aiSemanticParser.service.js";
import { classifyDocument } from "../services/documentClassifier.service.js";
import { validateExtractedData } from "../services/validationRules.service.js";
import { markDocumentComplete } from "../services/batchNotification.service.js";
import { upsertSupplierFromDocument } from "../services/supplier.service.js";
import { syncDueDateForDocument } from "../services/dueDateTags.service.js";
import logger, { logJob, logError, logValidation } from "../utils/logger.js";

logger.info("Document worker started");

async function processDocumentJob(job) {
  const { documentId } = job.data;
  const jobContext = { jobId: job.id, documentId };

  logJob("document-processing", "started", jobContext);

  try {
    await DocumentModel.updateStatus(documentId, "processing");

    const document = await DocumentModel.findByIdForWorker(documentId);

    logJob("document-processing", "extracting_text", {
      ...jobContext,
      userId: document.user_id,
      fileName: document.original_name,
    });

    const { extractTextFromPdf } = await import("../services/pdfExtractor.service.js");
    const rawText = await extractTextFromPdf(document.user_id, document.stored_name);

    await DocumentResultModel.upsertRawText(documentId, rawText);

    logger.debug("Raw text extracted", {
      ...jobContext,
      textLength: rawText.length,
    });

    logJob("document-processing", "classifying", jobContext);

    const { document_type, document_subtype } = await classifyDocument(rawText);

    logger.info("Document classified", {
      ...jobContext,
      document_type,
      document_subtype,
    });

    let semantic = null;
    let validationResult = { isValid: true, flags: [], validatedData: semantic };

    if (document_type === "invoice") {
      logJob("document-processing", "parsing_invoice", {
        ...jobContext,
        document_subtype,
      });

      const regexData = parseDocument(rawText);

      semantic = await extractSemanticData({
        rawText,
        regexData,
        document_subtype,
      });

      validationResult = validateExtractedData(semantic, document_subtype);

      if (validationResult.flags.length > 0) {
        logValidation(documentId, validationResult.flags, {
          document_subtype,
          userId: document.user_id,
        });
      }
    } else {
      logger.warn("Document is not an invoice", {
        ...jobContext,
        document_type,
        userId: document.user_id,
      });

      validationResult.flags.push({
        field: "document_type",
        severity: "critical",
        message: `This document is not an invoice. Detected type: "${document_type}". Please upload only invoices.`,
        type: "wrong_document_type",
        detected_type: document_type,
      });
    }

    const finalJson = {
      document_type,
      document_subtype,
      semantic: validationResult.validatedData,
      validation_flags: validationResult.flags,
    };

    await DocumentResultModel.updateParsedJson(documentId, finalJson);

    if (validationResult.validatedData) {
      await upsertSupplierFromDocument(
        document.user_id,
        documentId,
        validationResult.validatedData
      );

      try {
        await syncDueDateForDocument(
          documentId,
          document.user_id,
          validationResult.validatedData
        );
      } catch (dueDateErr) {
        logError(dueDateErr, {
          ...jobContext,
          operation: "sync_due_date_tags",
        });
      }
    }

    await DocumentModel.updateStatus(documentId, "done");

    logJob("document-processing", "completed", {
      ...jobContext,
      hasFlags: validationResult.flags.length > 0,
      flagCount: validationResult.flags.length,
    });

    try {
      await markDocumentComplete(
        documentId,
        document.user_id,
        document.original_name,
        "done"
      );
    } catch (emailError) {
      logError(emailError, {
        ...jobContext,
        operation: "batch_notification",
        phase: "success_email",
      });
    }
  } catch (err) {
    logError(err, {
      ...jobContext,
      operation: "document_processing",
      phase: "processing",
    });

    await DocumentModel.updateStatus(documentId, "failed");

    try {
      const doc = await DocumentModel.findByIdForWorker(documentId);
      await markDocumentComplete(
        documentId,
        doc.user_id,
        doc.original_name,
        "failed",
        err.message
      );
    } catch (emailError) {
      logError(emailError, {
        ...jobContext,
        operation: "batch_notification",
        phase: "error_email",
      });
    }

    logJob("document-processing", "failed", {
      ...jobContext,
      error: err.message,
    });

    throw err;
  }
}

const worker = new Worker("document-processing", (job) => processDocumentJob(job), {
  connection: redisConnection,
});

worker.on("error", (err) => {
  logger.warn("DocumentWorker error", { error: err.message });
});
