import { DocumentService } from "../../services/document.service.js";
import { logError } from "../../utils/logger.js";

export const getUserDocuments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const filters = {
    status: req.query.status || null,
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    search: req.query.search || null,
    defective: req.query.defective || null,
    supplier: req.query.supplier || null,
    tag: req.query.tag || null,
  };

  const result = await DocumentService.listUserDocuments(req.user.id, {
    page,
    limit,
    filters,
  });

  res.json(result);
};

export const getDocumentById = async (req, res) => {
  try {
    const document = await DocumentService.getDocumentById(req.params.id, req.user.id);
    res.json(document);
  } catch (err) {
    logError(err, {
      operation: "getDocumentById",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(404).json({ message: "Document not found" });
  }
};
