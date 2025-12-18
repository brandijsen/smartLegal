import { pool } from "../config/db.js";

export const DocumentResultModel = {
  async create({ documentId, rawText }) {
    await pool.execute(
      `
      INSERT INTO document_results (document_id, raw_text)
      VALUES (?, ?)
      `,
      [documentId, rawText]
    );
  },

  
};
