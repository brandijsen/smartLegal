import { DocumentModel } from "../models/document.model.js";
import { generateCSV, generateExcel } from "../services/export.service.js";
import { getRequestLogger } from "../middlewares/logger.middleware.js";
import { logError } from "../utils/logger.js";

export const exportDocumentsCSV = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status || "all",
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      search: req.query.search || null,
      defective: req.query.defective || "all",
      supplier: req.query.supplier || "all",
      tag: req.query.tag || "all",
    };

    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000,
      exportMode: true,
      filters,
    });

    log.info("CSV export started", { userId, documentCount: documents.length });

    const enriched = documents.map((doc) => ({
      ...doc,
      parsed_json:
        typeof doc.parsed_json === "string"
          ? JSON.parse(doc.parsed_json)
          : doc.parsed_json || null,
    }));

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
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Export failed" });
  }
};

export const exportDocumentsExcel = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status || "all",
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      search: req.query.search || null,
      defective: req.query.defective || "all",
      supplier: req.query.supplier || "all",
      tag: req.query.tag || "all",
    };

    const { documents } = await DocumentModel.findByUser(userId, {
      page: 1,
      limit: 10000,
      exportMode: true,
      filters,
    });

    log.info("Excel export started", { userId, documentCount: documents.length });

    const enriched = documents.map((doc) => ({
      ...doc,
      parsed_json:
        typeof doc.parsed_json === "string"
          ? JSON.parse(doc.parsed_json)
          : doc.parsed_json || null,
    }));

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
      userId: req.user?.id,
    });
    res.status(500).json({ message: "Export failed" });
  }
};
