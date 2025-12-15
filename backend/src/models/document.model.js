import { pool } from "../config/db.js";

export const DocumentModel = {
  async create({ userId, storedName, originalName }) {
    const [result] = await pool.execute(
      `
      INSERT INTO documents
      (user_id, stored_name, original_name, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [userId, storedName, originalName]
    );

    return {
      id: result.insertId,
      user_id: userId,
      stored_name: storedName,
      original_name: originalName,
      status: "pending"
    };
  },

  async findByUser(userId) {
    const [rows] = await pool.execute(
      `
      SELECT id, original_name, status, uploaded_at, processed_at
      FROM documents
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
      `,
      [userId]
    );

    return rows;
  },

async findById(documentId, userId) {
  const [rows] = await pool.execute(
    `
    SELECT id, original_name, status, uploaded_at, processed_at
    FROM documents
    WHERE id = ? AND user_id = ?
    `,
    [documentId, userId]
  );

  return rows[0];
},

  async updateStatus(id, status) {
    await pool.execute(
      `
      UPDATE documents
      SET status = ?,
          processed_at = IF(? IN ('done','failed'), NOW(), processed_at)
      WHERE id = ?
      `,
      [status, status, id]
    );
  },

  async updateStatusByStoredName(storedName, status) {
  await pool.execute(
    "UPDATE documents SET status = ? WHERE stored_name = ?",
    [status, storedName]
  );
}
};
