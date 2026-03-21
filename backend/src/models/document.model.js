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

  async findByUser(userId, { page = 1, limit = 10, filters = {}, exportMode = false } = {}) {
    // Ensure integers (SQL injection protection)
    const pageInt = Math.max(1, parseInt(page, 10) || 1);
    const limitInt = exportMode
      ? Math.min(10000, Math.max(1, parseInt(limit, 10) || 10000))
      : Math.min(100, Math.max(1, parseInt(limit, 10) || 10)); // max 100
    const offset = (pageInt - 1) * limitInt;

    // Build WHERE conditions
    const whereClauses = ["user_id = ?"];
    const params = [userId];

    // Filter by status
    if (filters.status && filters.status !== "all") {
      whereClauses.push("status = ?");
      params.push(filters.status);
    }

    // Filter by date (from)
    if (filters.dateFrom) {
      whereClauses.push("uploaded_at >= ?");
      params.push(filters.dateFrom);
    }

    // Filter by date (to)
    if (filters.dateTo) {
      whereClauses.push("uploaded_at <= ?");
      params.push(filters.dateTo + " 23:59:59");
    }

    // Filter by full-text search (filename + content)
    if (filters.search) {
      whereClauses.push(
        "(d.original_name LIKE ? OR dr.raw_text LIKE ?)"
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Filter by defective
    if (filters.defective === "only") {
      whereClauses.push("d.is_defective = 1");
    } else if (filters.excludeDefective) {
      whereClauses.push("(d.is_defective = 0 OR d.is_defective IS NULL)");
    }

    // Filter for invoices only (excludes non-invoice)
    if (filters.invoiceOnly) {
      whereClauses.push("JSON_UNQUOTE(JSON_EXTRACT(dr.parsed_json, '$.document_type')) = 'invoice'");
    }

    // Filter by supplier
    if (filters.supplier && filters.supplier !== "all") {
      const supplierId = parseInt(filters.supplier, 10);
      if (!isNaN(supplierId)) {
        whereClauses.push("d.supplier_id = ?");
        params.push(supplierId);
      }
    }

    if (filters.tag && filters.tag !== "all") {
      const tagId = parseInt(filters.tag, 10);
      if (!isNaN(tagId)) {
        whereClauses.push(
          "EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON dt.tag_id = t.id WHERE dt.document_id = d.id AND dt.tag_id = ? AND t.user_id = ?)"
        );
        params.push(tagId, userId);
      }
    }

    const whereSQL = whereClauses
      .map(clause => clause.replace(/^(user_id|status|uploaded_at|original_name)/, 'd.$1'))
      .join(" AND ");

    // Query for paginated documents with JOIN for full-text search + metadata
    const [rows] = await pool.execute(
      `
      SELECT DISTINCT 
        d.id, 
        d.original_name, 
        d.status, 
        d.uploaded_at, 
        d.processed_at,
        d.is_defective,
        d.marked_defective_at,
        d.supplier_id,
        s.name AS supplier_name,
        s.vat_number AS supplier_vat_number,
        dr.manually_edited,
        dr.parsed_json
      FROM documents d
      LEFT JOIN suppliers s ON d.supplier_id = s.id AND s.user_id = d.user_id
      LEFT JOIN document_results dr ON d.id = dr.document_id
      WHERE ${whereSQL}
      ORDER BY d.uploaded_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
      `,
      params
    );

    // Query for total count
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
      d.id,
      d.original_name,
      d.stored_name,
      d.status,
      d.uploaded_at,
      d.processed_at,
      d.is_defective,
      d.marked_defective_at,
      d.supplier_id,
      s.name AS supplier_name,
      s.vat_number AS supplier_vat_number
    FROM documents d
    LEFT JOIN suppliers s ON d.supplier_id = s.id AND s.user_id = d.user_id
    WHERE d.id = ? AND d.user_id = ?
    `,
    [documentId, userId]
  );

  const doc = rows[0];
  if (!doc) return null;

  const { supplier_id, supplier_name, supplier_vat_number, ...rest } = doc;
  return {
    ...rest,
    supplier_id: supplier_id || null,
    supplier: supplier_id
      ? { id: supplier_id, name: supplier_name, vat_number: supplier_vat_number }
      : null,
  };
},


async findByIdForWorker(documentId) {
  const [rows] = await pool.execute(
    `
    SELECT id, user_id, stored_name, original_name
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

  async bulkUpdateStatusForUser(userId, ids, status) {
    if (!ids?.length) return 0;
    const placeholders = ids.map(() => "?").join(",");
    const [result] = await pool.execute(
      `
      UPDATE documents
      SET status = ?,
          processed_at = IF(? IN ('done','failed'), NOW(), processed_at)
      WHERE user_id = ? AND id IN (${placeholders})
      `,
      [status, status, userId, ...ids]
    );
    return result.affectedRows || 0;
  },

  async updateSupplierId(documentId, userId, supplierId) {
    await pool.execute(
      `UPDATE documents SET supplier_id = ? WHERE id = ? AND user_id = ?`,
      [supplierId, documentId, userId]
    );
  },

  async markAsDefective(documentId, userId) {
    await pool.execute(
      `
      UPDATE documents
      SET is_defective = 1,
          marked_defective_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [documentId, userId]
    );
  },

  async unmarkAsDefective(documentId, userId) {
    await pool.execute(
      `
      UPDATE documents
      SET is_defective = 0,
          marked_defective_at = NULL
      WHERE id = ? AND user_id = ?
      `,
      [documentId, userId]
    );
  },

  async bulkUnmarkDefective(userId, documentIds) {
    if (!documentIds?.length) return 0;
    const placeholders = documentIds.map(() => "?").join(",");
    const [result] = await pool.execute(
      `UPDATE documents
       SET is_defective = 0, marked_defective_at = NULL
       WHERE id IN (${placeholders}) AND user_id = ? AND is_defective = 1`,
      [...documentIds, userId]
    );
    return result.affectedRows || 0;
  },

  /** IDs owned by user, in requested set, currently failed (for bulk retry). */
  async findFailedDocumentIdsForUser(userId, documentIds) {
    if (!documentIds?.length) return [];
    const ids = documentIds
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n));
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await pool.execute(
      `SELECT id FROM documents
       WHERE user_id = ? AND status = 'failed' AND id IN (${placeholders})`,
      [userId, ...ids]
    );
    return rows.map((r) => r.id);
  },

  async findDefectiveDocuments(userId) {
    const [rows] = await pool.execute(
      `
      SELECT 
        d.id,
        d.original_name,
        d.uploaded_at,
        d.marked_defective_at,
        dr.parsed_json
      FROM documents d
      LEFT JOIN document_results dr ON d.id = dr.document_id
      WHERE d.user_id = ? AND d.is_defective = 1
      ORDER BY d.marked_defective_at DESC
      `,
      [userId]
    );
    return rows;
  },

  async deleteById(documentId) {
  await pool.execute(
    "DELETE FROM documents WHERE id = ?",
    [documentId]
  );
}


};
