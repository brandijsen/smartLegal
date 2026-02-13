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

  async findByUser(userId, { page = 1, limit = 10, filters = {} } = {}) {
    // Assicurati che siano interi (protezione SQL injection)
    const pageInt = Math.max(1, parseInt(page, 10) || 1);
    const limitInt = Math.min(100, Math.max(1, parseInt(limit, 10) || 10)); // max 100
    const offset = (pageInt - 1) * limitInt;

    // Build WHERE conditions
    const whereClauses = ["user_id = ?"];
    const params = [userId];

    // Filtro per status
    if (filters.status && filters.status !== "all") {
      whereClauses.push("status = ?");
      params.push(filters.status);
    }

    // Filtro per data (from)
    if (filters.dateFrom) {
      whereClauses.push("uploaded_at >= ?");
      params.push(filters.dateFrom);
    }

    // Filtro per data (to)
    if (filters.dateTo) {
      whereClauses.push("uploaded_at <= ?");
      params.push(filters.dateTo + " 23:59:59");
    }

    // Filtro per search full-text (nome file + contenuto)
    if (filters.search) {
      whereClauses.push(
        "(d.original_name LIKE ? OR dr.raw_text LIKE ?)"
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereSQL = whereClauses
      .map(clause => clause.replace(/^(user_id|status|uploaded_at|original_name)/, 'd.$1'))
      .join(" AND ");

    // Query per i documenti paginati con JOIN per ricerca full-text
    const [rows] = await pool.execute(
      `
      SELECT DISTINCT d.id, d.original_name, d.status, d.uploaded_at, d.processed_at
      FROM documents d
      LEFT JOIN document_results dr ON d.id = dr.document_id
      WHERE ${whereSQL}
      ORDER BY d.uploaded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
      `,
      params
    );

    // Query per il conteggio totale
    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT d.id) as total 
       FROM documents d
       LEFT JOIN document_results dr ON d.id = dr.document_id
       WHERE ${whereSQL}`,
      params
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limitInt);

    return {
      documents: rows,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNextPage: pageInt < totalPages,
        hasPrevPage: pageInt > 1
      }
    };
  },

async findById(documentId, userId) {
  const [rows] = await pool.execute(
    `
    SELECT
      id,
      original_name,
      stored_name,
      status,
      uploaded_at,
      processed_at
    FROM documents
    WHERE id = ? AND user_id = ?
    `,
    [documentId, userId]
  );

  return rows[0];
},


async findByIdForWorker(documentId) {
  const [rows] = await pool.execute(
    `
    SELECT id, user_id, stored_name
    FROM documents
    WHERE id = ?
    `,
    [documentId]
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

  async deleteById(documentId) {
  await pool.execute(
    "DELETE FROM documents WHERE id = ?",
    [documentId]
  );
}


};
