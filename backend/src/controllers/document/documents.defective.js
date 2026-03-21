import { DocumentService } from "../../services/document.service.js";
import { DocumentModel } from "../../models/document.model.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { logError } from "../../utils/logger.js";

export const bulkUnmarkDefective = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const userId = req.user.id;
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "documentIds array is required" });
    }

    const count = await DocumentModel.bulkUnmarkDefective(userId, documentIds);

    log.info("Bulk unmark defective", { userId, count, documentIds });

    res.json({ message: `${count} document(s) unmarked as defective`, count });
  } catch (err) {
    logError(err, {
      operation: "bulkUnmarkDefective",
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Operation failed" });
  }
};

export const markDocumentDefective = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    await DocumentService.getDocumentById(documentId, userId);

    await DocumentModel.markAsDefective(documentId, userId);

    log.info("Document marked as defective", { documentId });

    res.json({ message: "Document marked as defective" });
  } catch (err) {
    logError(err, {
      operation: "markDocumentDefective",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Operation failed" });
  }
};

export const unmarkDocumentDefective = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    await DocumentService.getDocumentById(documentId, userId);

    await DocumentModel.unmarkAsDefective(documentId, userId);

    log.info("Document unmarked as defective", { documentId });

    res.json({ message: "Document unmarked as defective" });
  } catch (err) {
    logError(err, {
      operation: "unmarkDocumentDefective",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Operation failed" });
  }
};

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
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Operation failed" });
  }
};
