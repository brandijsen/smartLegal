import { DocumentService } from "../../services/document.service.js";
import { DocumentModel } from "../../models/document.model.js";
import { DocumentResultModel } from "../../models/documentResult.model.js";
import { SupplierModel } from "../../models/supplier.model.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { logError } from "../../utils/logger.js";

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

    await DocumentService.getDocumentById(documentId, userId);

    await DocumentResultModel.updateParsedJsonManually(documentId, parsed_json, userId);

    log.info("Document result manually updated", { documentId });

    res.json({
      message: "Document result updated successfully",
      manually_edited: true,
    });
  } catch (err) {
    logError(err, {
      operation: "updateDocumentResult",
      userId: req.user?.id,
      documentId: req.params.id,
    });
    res.status(500).json({ message: "Update failed" });
  }
};

export const updateDocumentSupplier = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const { supplier_id } = req.body;

    if (supplier_id === undefined) {
      return res.status(400).json({ message: "supplier_id is required" });
    }

    if (supplier_id !== null) {
      const supplier = await SupplierModel.findById(supplier_id, userId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
    }

    await DocumentService.getDocumentById(documentId, userId);
    await DocumentModel.updateSupplierId(documentId, userId, supplier_id);

    log.info("Document supplier updated", { documentId, supplier_id });

    const doc = await DocumentModel.findById(documentId, userId);
    res.json(doc);
  } catch (err) {
    logError(err, {
      operation: "updateDocumentSupplier",
      userId: req.user?.id,
      documentId: req.params?.id,
    });
    if (err.message === "Document not found") {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(500).json({ message: "Operation failed" });
  }
};
