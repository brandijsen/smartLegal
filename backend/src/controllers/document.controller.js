import { DocumentService } from "../services/document.service.js";
import { DocumentModel } from "../models/document.model.js";
import { documentQueue } from "../queues/documentQueue.js";
import path from "path";
import fs from "fs";

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const document = await DocumentService.upload({
      userId: req.user.id,
      file: req.file
    });

   await documentQueue.add("process-document", {
      documentId: document.id,
    });

    res.status(201).json(document);
  } catch (err) {
    console.error(err);

    // 👇 FIX PUNTO 2
    if (req.file?.filename) {
      await DocumentModel.updateStatusByStoredName(
        req.file.filename,
        "failed"
      );
    }

    res.status(500).json({ message: "Upload failed" });
  }
};

export const retryDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    // 1️⃣ recupero documento dell’utente
    const document = await DocumentService.getDocumentById(documentId, userId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // 2️⃣ solo se failed
    if (document.status !== "failed") {
      return res.status(400).json({
        message: "Only failed documents can be retried"
      });
    }

    // 3️⃣ reset stato
    await DocumentModel.updateStatus(documentId, "pending");

    // 4️⃣ rimetti in coda
    await documentQueue.add("process-document", { documentId });

    res.json({ message: "Document re-queued successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Retry failed" });
  }
};



export const getUserDocuments = async (req, res) => {
  const docs = await DocumentService.listUserDocuments(req.user.id);
  res.json(docs);

  
};

export const getDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentService.getDocumentById(documentId, userId);

    res.json(document);
  } catch (err) {
    res.status(404).json({ message: "Document not found" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await DocumentModel.findById(documentId, userId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // path file
    const filePath = path.join(
      process.cwd(),
      "src",
      "uploads",
      "users",
      String(userId),
      document.stored_name
    );

    // elimina file se esiste
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // elimina record (CASCADE su document_results)
    await DocumentModel.deleteById(documentId);

    res.json({ message: "Document deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};