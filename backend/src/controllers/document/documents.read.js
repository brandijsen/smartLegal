import fs from "fs";
import { DocumentService } from "../../services/document.service.js";
import { DocumentModel } from "../../models/document.model.js";
import { DocumentResultModel } from "../../models/documentResult.model.js";
import { getFilePath } from "../../config/upload.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { logError } from "../../utils/logger.js";

export const getDocumentResult = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    await DocumentService.getDocumentById(documentId, userId);

    const result = await DocumentResultModel.findParsedByDocumentId(documentId);

    if (!result || !result.parsed_json) {
      log.debug("Parsed result not yet available", { documentId });
      return res.status(404).json({ message: "Result not available yet" });
    }

    const parsed =
      typeof result.parsed_json === "string" ? JSON.parse(result.parsed_json) : result.parsed_json;

    res.json({
      parsed_json: parsed,
      manually_edited: result.manually_edited || false,
      edited_at: result.edited_at || null,
    });
  } catch (err) {
    logError(err, {
      operation: "getDocumentResult",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(404).json({ message: "Document not found" });
  }
};

export const getDocumentRaw = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    await DocumentService.getDocumentById(documentId, userId);

    const result = await DocumentResultModel.findRawByDocumentId(documentId);

    if (!result) {
      log.debug("Raw text not yet available", { documentId });
      return res.status(404).json({ message: "Raw text not available yet" });
    }

    res.json({ raw_text: result.raw_text || "" });
  } catch (err) {
    logError(err, {
      operation: "getDocumentRaw",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(404).json({ message: "Document not found" });
  }
};

export const downloadDocument = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentModel.findById(documentId, userId);

    if (!document) {
      log.warn("Download attempted on non-existent document", { documentId });
      return res.status(404).json({ message: "Document not found" });
    }

    const filePath = getFilePath(userId, document.stored_name);

    if (!fs.existsSync(filePath)) {
      log.error("Document file not found on filesystem", { documentId, filePath });
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    log.info("Document download started", { documentId, originalName: document.original_name });

    res.download(filePath, document.original_name, (err) => {
      if (err) {
        logError(err, {
          operation: "downloadDocument",
          documentId,
          userId,
          filePath,
        });
        if (!res.headersSent) {
          res.status(500).json({ message: "Download failed" });
        }
      } else {
        log.info("Document download completed", { documentId });
      }
    });
  } catch (err) {
    logError(err, {
      operation: "downloadDocument",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Download failed" });
  }
};
