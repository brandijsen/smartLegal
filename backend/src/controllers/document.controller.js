import { DocumentService } from "../services/document.service.js";
import { DocumentModel } from "../models/document.model.js";

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const document = await DocumentService.upload({
      userId: req.user.id,
      file: req.file
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
