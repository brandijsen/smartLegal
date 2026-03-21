import fs from "fs";
import { DocumentModel } from "../../models/document.model.js";
import { getFilePath } from "../../config/upload.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { logError } from "../../utils/logger.js";

export const deleteDocument = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentModel.findById(documentId, userId);

    if (!document) {
      log.warn("Delete attempted on non-existent document", { documentId });
      return res.status(404).json({ message: "Document not found" });
    }

    const filePath = getFilePath(userId, document.stored_name);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log.debug("Document file deleted from filesystem", { documentId, filePath });
    }

    await DocumentModel.deleteById(documentId);

    log.info("Document deleted successfully", { documentId, originalName: document.original_name });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    logError(err, {
      operation: "deleteDocument",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Delete failed" });
  }
};

const BULK_DELETE_MAX = 100;

export const bulkDeleteDocuments = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const userId = req.user.id;
    const raw = req.body?.documentIds;

    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ message: "documentIds must be a non-empty array" });
    }
    if (raw.length > BULK_DELETE_MAX) {
      return res.status(400).json({ message: `At most ${BULK_DELETE_MAX} documents per request` });
    }

    const rows = await DocumentModel.findDocumentsForBulkDelete(userId, raw);
    if (!rows.length) {
      return res.json({ deleted: 0, message: "No matching documents" });
    }

    for (const doc of rows) {
      const filePath = getFilePath(userId, doc.stored_name);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          log.debug("Document file deleted (bulk)", { documentId: doc.id, filePath });
        } catch (unlinkErr) {
          log.warn("Bulk delete: file unlink failed", {
            documentId: doc.id,
            error: unlinkErr.message,
          });
        }
      }
    }

    const ids = rows.map((r) => r.id);
    const deleted = await DocumentModel.deleteByIdsForUser(userId, ids);

    log.info("Bulk document delete completed", { userId, deleted, requested: raw.length });

    res.json({
      deleted,
      message: deleted > 0 ? "Documents deleted successfully" : "No documents removed",
    });
  } catch (err) {
    logError(err, {
      operation: "bulkDeleteDocuments",
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Bulk delete failed" });
  }
};
