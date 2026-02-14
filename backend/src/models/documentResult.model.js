import { pool } from "../config/db.js";

export const DocumentResultModel = {
  async upsertRawText(documentId, rawText) {
    await pool.execute(
      `
      INSERT INTO document_results (document_id, raw_text)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        raw_text = VALUES(raw_text)
      `,
      [documentId, rawText]
    );
  },

  async updateParsedJson(documentId, parsedJson) {
    await pool.execute(
      `
      UPDATE document_results
      SET parsed_json = ?
      WHERE document_id = ?
      `,
      [JSON.stringify(parsedJson), documentId]
    );
  },

  async updateParsedJsonManually(documentId, parsedJson, userId) {
    await pool.execute(
      `
      UPDATE document_results
      SET parsed_json = ?,
          manually_edited = 1,
          edited_at = NOW(),
          edited_by = ?
      WHERE document_id = ?
      `,
      [JSON.stringify(parsedJson), userId, documentId]
    );
  },

  async findParsedByDocumentId(documentId) {
    const [rows] = await pool.execute(
      `SELECT parsed_json, manually_edited, edited_at FROM document_results WHERE document_id = ?`,
      [documentId]
    );
    return rows[0];
  },

  async findRawByDocumentId(documentId) {
    const [rows] = await pool.execute(
      `SELECT raw_text FROM document_results WHERE document_id = ?`,
      [documentId]
    );
    return rows[0];
  },
};

