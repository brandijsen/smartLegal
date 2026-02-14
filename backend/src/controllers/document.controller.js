import path from "path";
import fs from "fs";

import { DocumentService } from "../services/document.service.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { documentQueue } from "../queues/documentQueue.js";
import { generateCSV, generateExcel } from "../services/export.service.js";
import { createBatch, registerDocumentInBatch } from "../services/batchNotification.service.js";
import { getRequestLogger } from "../middlewares/logger.middleware.js";
import { logError } from "../utils/logger.js";

/*
|--------------------------------------------------------------------------
| UPLOAD DOCUMENT (supports single and multiple files)
|--------------------------------------------------------------------------
| - crea record documents
| - mette in coda i job
| - registra batch per notifiche raggruppate
| - NON tocca document_results
*/
export const uploadDocument = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    // Supporto sia single che multiple files
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      log.warn("Upload attempted without files");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const documents = [];
    
    // Crea batch ID se upload multiplo (2+ files)
    const batchId = files.length > 1 ? createBatch(userId, files.length) : null;

    log.info("Document upload started", {
      fileCount: files.length,
      batchId,
      fileNames: files.map(f => f.originalname)
    });

    // Process ogni file
    for (const file of files) {
      const document = await DocumentService.upload({
        userId,
        file,
      });

      await documentQueue.add("process-document", {
        documentId: document.id,
      });
      
      // Registra nel batch se upload multiplo
      if (batchId) {
        await registerDocumentInBatch(batchId, document.id, file.originalname);
      }

      documents.push(document);
    }

    log.info("Document upload completed successfully", {
      fileCount: files.length,
      documentIds: documents.map(d => d.id)
    });

    // Response
    if (files.length === 1) {
      res.status(201).json(documents[0]);
    } else {
      res.status(201).json({
        message: `${files.length} documents uploaded successfully`,
        documents,
        batchId
      });
    }
  } catch (err) {
    logError(err, {
      operation: "uploadDocument",
      userId: req.user?.id,
      fileCount: (req.files || []).length
    });
    res.status(500).json({ message: "Upload failed" });
  }
};

/*
|--------------------------------------------------------------------------
| RETRY DOCUMENT
|--------------------------------------------------------------------------
*/
export const retryDocument = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentService.getDocumentById(documentId, userId);

    if (document.status !== "failed") {
      log.warn("Retry attempted on non-failed document", { documentId, status: document.status });
      return res
        .status(400)
        .json({ message: "Only failed documents can be retried" });
    }

    await DocumentModel.updateStatus(documentId, "pending");
    await documentQueue.add("process-document", { documentId });

    log.info("Document retry queued", { documentId });

    res.json({ message: "Document re-queued successfully" });
  } catch (err) {
    logError(err, {
      operation: "retryDocument",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(500).json({ message: "Retry failed" });
  }
};

/*
|--------------------------------------------------------------------------
| LIST USER DOCUMENTS
|--------------------------------------------------------------------------
*/
export const getUserDocuments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Filtri
  const filters = {
    status: req.query.status || null,
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    search: req.query.search || null
  };

  const result = await DocumentService.listUserDocuments(req.user.id, {
    page,
    limit,
    filters
  });

  res.json(result);
};

/*
|--------------------------------------------------------------------------
| GET DOCUMENT METADATA
|--------------------------------------------------------------------------
*/
export const getDocumentById = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const document = await DocumentService.getDocumentById(
      req.params.id,
      req.user.id
    );
    res.json(document);
  } catch (err) {
    logError(err, {
      operation: "getDocumentById",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE DOCUMENT
|--------------------------------------------------------------------------
*/
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

    const filePath = path.join(
      process.cwd(),
      "src",
      "uploads",
      "users",
      String(userId),
      document.stored_name
    );

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
      documentId: req.params.id
    });
    res.status(500).json({ message: "Delete failed" });
  }
};

/*
|--------------------------------------------------------------------------
| GET PARSED RESULT
|--------------------------------------------------------------------------
| - legge SOLO document_results
| - NON crea nulla
*/
export const getDocumentResult = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // ownership check
    await DocumentService.getDocumentById(documentId, userId);

    const result =
      await DocumentResultModel.findParsedByDocumentId(documentId);

    if (!result || !result.parsed_json) {
      log.debug("Parsed result not yet available", { documentId });
      return res
        .status(404)
        .json({ message: "Result not available yet" });
    }

    const parsed =
      typeof result.parsed_json === "string"
        ? JSON.parse(result.parsed_json)
        : result.parsed_json;

    res.json({
      parsed_json: parsed,
      manually_edited: result.manually_edited || false,
      edited_at: result.edited_at || null,
    });
  } catch (err) {
    logError(err, {
      operation: "getDocumentResult",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| GET RAW TEXT
|--------------------------------------------------------------------------
*/
export const getDocumentRaw = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // ownership check
    await DocumentService.getDocumentById(documentId, userId);

    const result =
      await DocumentResultModel.findRawByDocumentId(documentId);

    if (!result) {
      log.debug("Raw text not yet available", { documentId });
      return res
        .status(404)
        .json({ message: "Raw text not available yet" });
    }

    // Anche se raw_text è vuoto o null, restituiscilo comunque
    res.json({ raw_text: result.raw_text || "" });
  } catch (err) {
    logError(err, {
      operation: "getDocumentRaw",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| DOWNLOAD PDF
|--------------------------------------------------------------------------
*/
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

    const filePath = path.join(
      process.cwd(),
      "src",
      "uploads",
      "users",
      String(userId),
      document.stored_name
    );

    if (!fs.existsSync(filePath)) {
      log.error("Document file not found on filesystem", { documentId, filePath });
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    log.info("Document download started", { documentId, originalName: document.original_name });

    // Invia il file come download
    res.download(filePath, document.original_name, (err) => {
      if (err) {
        logError(err, {
          operation: "downloadDocument",
          documentId,
          userId,
          filePath
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
      documentId: req.params.id
    });
    res.status(500).json({ message: "Download failed" });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT DOCUMENTS CSV
|--------------------------------------------------------------------------
*/
export const exportDocumentsCSV = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const userId = req.user.id;

    // Ottieni tutti i documenti dell'utente con risultati parsed
    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000 // export tutti
    });

    log.info("CSV export started", { userId, documentCount: documents.length });

    // Arricchisci con parsed_json
    const enriched = await Promise.all(
      documents.map(async (doc) => {
        const result = await DocumentResultModel.findParsedByDocumentId(doc.id);
        return {
          ...doc,
          parsed_json:
            typeof result?.parsed_json === "string"
              ? JSON.parse(result.parsed_json)
              : result?.parsed_json || null
        };
      })
    );

    const csv = generateCSV(enriched);

    log.info("CSV export completed", { userId, size: csv.length });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="documents-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (err) {
    logError(err, {
      operation: "exportDocumentsCSV",
      userId: req.user?.id
    });
    res.status(500).json({ message: "Export failed" });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PARSED RESULT (Manual Edit)
|--------------------------------------------------------------------------
*/
export const updateDocumentResult = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const { parsed_json } = req.body;

    if (!parsed_json) {
      log.warn("Update attempted without parsed_json", { documentId });
      return res.status(400).json({ message: "parsed_json is required" });
    }

    // Ownership check
    await DocumentService.getDocumentById(documentId, userId);

    // Update with manual edit flag
    await DocumentResultModel.updateParsedJsonManually(
      documentId,
      parsed_json,
      userId
    );

    log.info("Document result manually updated", { documentId });

    res.json({ 
      message: "Document result updated successfully",
      manually_edited: true 
    });
  } catch (err) {
    logError(err, {
      operation: "updateDocumentResult",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(500).json({ message: "Update failed" });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT DOCUMENTS EXCEL
|--------------------------------------------------------------------------
*/
export const exportDocumentsExcel = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const userId = req.user.id;

    // Ottieni tutti i documenti dell'utente con risultati parsed
    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000 // export tutti
    });

    log.info("Excel export started", { userId, documentCount: documents.length });

    // Arricchisci con parsed_json
    const enriched = await Promise.all(
      documents.map(async (doc) => {
        const result = await DocumentResultModel.findParsedByDocumentId(doc.id);
        return {
          ...doc,
          parsed_json:
            typeof result?.parsed_json === "string"
              ? JSON.parse(result.parsed_json)
              : result?.parsed_json || null
        };
      })
    );

    const buffer = generateExcel(enriched);

    log.info("Excel export completed", { userId, size: buffer.length });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="documents-${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    logError(err, {
      operation: "exportDocumentsExcel",
      userId: req.user?.id
    });
    res.status(500).json({ message: "Export failed" });
  }
};

/*
|--------------------------------------------------------------------------
| MARK DOCUMENT AS DEFECTIVE
|--------------------------------------------------------------------------
*/
export const markDocumentDefective = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // Ownership check
    await DocumentService.getDocumentById(documentId, userId);

    await DocumentModel.markAsDefective(documentId, userId);

    log.info("Document marked as defective", { documentId });

    res.json({ message: "Document marked as defective" });
  } catch (err) {
    logError(err, {
      operation: "markDocumentDefective",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(500).json({ message: "Operation failed" });
  }
};

/*
|--------------------------------------------------------------------------
| UNMARK DOCUMENT AS DEFECTIVE
|--------------------------------------------------------------------------
*/
export const unmarkDocumentDefective = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // Ownership check
    await DocumentService.getDocumentById(documentId, userId);

    await DocumentModel.unmarkAsDefective(documentId, userId);

    log.info("Document unmarked as defective", { documentId });

    res.json({ message: "Document unmarked as defective" });
  } catch (err) {
    logError(err, {
      operation: "unmarkDocumentDefective",
      userId: req.user?.id,
      documentId: req.params.id
    });
    res.status(500).json({ message: "Operation failed" });
  }
};

/*
|--------------------------------------------------------------------------
| GET DEFECTIVE DOCUMENTS
|--------------------------------------------------------------------------
*/
export const getDefectiveDocuments = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const userId = req.user.id;
    const documents = await DocumentModel.findDefectiveDocuments(userId);
    
    log.info("Defective documents retrieved", { userId, count: documents.length });
    
    res.json({ documents });
  } catch (err) {
    logError(err, {
      operation: "getDefectiveDocuments",
      userId: req.user?.id
    });
    res.status(500).json({ message: "Operation failed" });
  }
};
