import { DocumentModel } from "../models/document.model.js";

export const DocumentService = {
  async upload({ userId, file }) {
    return DocumentModel.create({
      userId,
      storedName: file.filename,
      originalName: file.originalname
    });
  },

  async listUserDocuments(userId, { page, limit, filters } = {}) {
    return DocumentModel.findByUser(userId, { page, limit, filters });
  },

  async getDocumentById(documentId, userId) {
  const doc = await DocumentModel.findById(documentId, userId);
  if (!doc) {
    throw new Error("Document not found");
  }
  return doc;
}
};
