import path from "path";
import fs from "fs";

import { DocumentService } from "../services/document.service.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentResultModel } from "../models/documentResult.model.js";
import { documentQueue } from "../queues/documentQueue.js";
import { generateCSV, generateExcel } from "../services/export.service.js";

/*
|--------------------------------------------------------------------------
| UPLOAD DOCUMENT
|--------------------------------------------------------------------------
| - crea record documents
| - mette in coda il job
| - NON tocca document_results
*/
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const document = await DocumentService.upload({
      userId: req.user.id,
      file: req.file,
    });

    await documentQueue.add("process-document", {
      documentId: document.id,
    });

    res.status(201).json(document);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

/*
|--------------------------------------------------------------------------
| RETRY DOCUMENT
|--------------------------------------------------------------------------
*/
export const retryDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentService.getDocumentById(documentId, userId);

    if (document.status !== "failed") {
      return res
        .status(400)
        .json({ message: "Only failed documents can be retried" });
    }

    await DocumentModel.updateStatus(documentId, "pending");

    await documentQueue.add("process-document", { documentId });

    res.json({ message: "Document re-queued successfully" });
  } catch (err) {
    console.error(err);
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
  try {
    const document = await DocumentService.getDocumentById(
      req.params.id,
      req.user.id
    );
    res.json(document);
  } catch {
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE DOCUMENT
|--------------------------------------------------------------------------
*/
export const deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentModel.findById(documentId, userId);

    if (!document) {
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
    }

    await DocumentModel.deleteById(documentId);

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error(err);
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
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // ownership check
    await DocumentService.getDocumentById(documentId, userId);

    const result =
      await DocumentResultModel.findParsedByDocumentId(documentId);

    if (!result || !result.parsed_json) {
      return res
        .status(404)
        .json({ message: "Result not available yet" });
    }

    const parsed =
      typeof result.parsed_json === "string"
        ? JSON.parse(result.parsed_json)
        : result.parsed_json;

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| GET RAW TEXT
|--------------------------------------------------------------------------
*/
export const getDocumentRaw = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // ownership check
    await DocumentService.getDocumentById(documentId, userId);

    const result =
      await DocumentResultModel.findRawByDocumentId(documentId);

    if (!result) {
      return res
        .status(404)
        .json({ message: "Raw text not available yet" });
    }

    // Anche se raw_text è vuoto o null, restituiscilo comunque
    res.json({ raw_text: result.raw_text || "" });
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: "Document not found" });
  }
};

/*
|--------------------------------------------------------------------------
| DOWNLOAD PDF
|--------------------------------------------------------------------------
*/
export const downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentModel.findById(documentId, userId);

    if (!document) {
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
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    // Invia il file come download
    res.download(filePath, document.original_name, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Download failed" });
        }
      }
    });
  } catch (err) {
    console.error("Download failed:", err);
    res.status(500).json({ message: "Download failed" });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT DOCUMENTS CSV
|--------------------------------------------------------------------------
*/
export const exportDocumentsCSV = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ottieni tutti i documenti dell'utente con risultati parsed
    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000 // export tutti
    });

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

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="documents-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error("Export CSV failed:", err);
    res.status(500).json({ message: "Export failed" });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT DOCUMENTS EXCEL
|--------------------------------------------------------------------------
*/
export const exportDocumentsExcel = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ottieni tutti i documenti dell'utente con risultati parsed
    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000 // export tutti
    });

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
    console.error("Export Excel failed:", err);
    res.status(500).json({ message: "Export failed" });
  }
};
