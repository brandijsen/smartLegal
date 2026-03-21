import { DocumentService } from "../services/document.service.js";
import { DocumentModel } from "../models/document.model.js";
import { documentQueue } from "../queues/documentQueue.js";
import { createBatch, registerDocumentInBatch } from "../services/batchNotification.service.js";
import { getRequestLogger } from "../middlewares/logger.middleware.js";
import { logError } from "../utils/logger.js";

/*
|--------------------------------------------------------------------------
| UPLOAD DOCUMENT (supports single and multiple files)
|--------------------------------------------------------------------------
*/
export const uploadDocument = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      log.warn("Upload attempted without files");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const documents = [];

    const batchId = files.length > 1 ? createBatch(userId, files.length) : null;

    log.info("Document upload started", {
      fileCount: files.length,
      batchId,
      fileNames: files.map((f) => f.originalname),
    });

    for (const file of files) {
      const document = await DocumentService.upload({
        userId,
        file,
      });

      try {
        await Promise.race([
          documentQueue.add("process-document", { documentId: document.id }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Queue timeout: Redis unavailable")), 5000)
          ),
        ]);
      } catch (queueErr) {
        log.warn("Document queued as pending (Redis unavailable)", {
          documentId: document.id,
          error: queueErr.message,
        });
      }

      if (batchId) {
        await registerDocumentInBatch(batchId, document.id, file.originalname);
      }

      documents.push(document);
    }

    log.info("Document upload completed successfully", {
      fileCount: files.length,
      documentIds: documents.map((d) => d.id),
    });

    if (files.length === 1) {
      res.status(201).json(documents[0]);
    } else {
      res.status(201).json({
        message: `${files.length} documents uploaded successfully`,
        documents,
        batchId,
      });
    }
  } catch (err) {
    logError(err, {
      operation: "uploadDocument",
      userId: req.user?.id,
      fileCount: (req.files || []).length,
    });
    res.status(500).json({ message: "Upload failed" });
  }
};

export const retryDocument = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentService.getDocumentById(documentId, userId);

    if (document.status !== "failed") {
      log.warn("Retry attempted on non-failed document", { documentId, status: document.status });
      return res.status(400).json({ message: "Only failed documents can be retried" });
    }

    await DocumentModel.updateStatus(documentId, "pending");
    try {
      await Promise.race([
        documentQueue.add("process-document", { documentId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Queue timeout: Redis unavailable")), 5000)
        ),
      ]);
    } catch (queueErr) {
      log.warn("Retry queued as pending (Redis unavailable)", {
        documentId,
        error: queueErr.message,
      });
    }

    log.info("Document retry queued", { documentId });

    res.json({ message: "Document re-queued successfully" });
  } catch (err) {
    logError(err, {
      operation: "retryDocument",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Retry failed" });
  }
};

export const bulkRetryDocuments = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const userId = req.user.id;
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "documentIds array is required" });
    }

    const failedIds = await DocumentModel.findFailedDocumentIdsForUser(userId, documentIds);

    if (failedIds.length === 0) {
      return res.json({
        message: "No failed documents to retry",
        queued: 0,
      });
    }

    await DocumentModel.bulkUpdateStatusForUser(userId, failedIds, "pending");

    let queued = 0;
    for (const docId of failedIds) {
      try {
        await Promise.race([
          documentQueue.add("process-document", { documentId: docId }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Queue timeout")), 5000)),
        ]);
        queued++;
      } catch (queueErr) {
        log.warn("Bulk retry queue error", { documentId: docId, error: queueErr.message });
      }
    }

    log.info("Bulk retry completed", { userId, documentIds, failedIds, queued });

    res.json({
      message: queued > 0 ? `${queued} document(s) re-queued` : "No failed documents to retry",
      queued,
    });
  } catch (err) {
    logError(err, {
      operation: "bulkRetryDocuments",
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Bulk retry failed" });
  }
};
