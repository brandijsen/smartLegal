import { pool } from "../config/db.js";

export const TagModel = {
  async findByUser(userId, { limit = 500, search } = {}) {
    const limitInt = Math.min(500, Math.max(1, parseInt(limit, 10) || 500));
    let sql = `SELECT id, user_id, name, color, created_at FROM tags WHERE user_id = ?`;
    const params = [userId];

    if (search && search.trim()) {
      sql += ` AND name LIKE ?`;
      params.push(`%${search.trim()}%`);
    }
    sql += ` ORDER BY name ASC LIMIT ${limitInt}`;

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async create({ userId, name, color }) {
    const [result] = await pool.query(
      `INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)`,
      [userId, name, color || null]
    );
    return { id: result.insertId, user_id: userId, name, color, created_at: new Date() };
  },

  async update(id, userId, { name, color }) {
    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      params.push(color);
    }
    if (updates.length === 0) return null;
    params.push(id, userId);
    await pool.query(
      `UPDATE tags SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );
    return { id, name, color };
  },

  async delete(id, userId) {
    const [result] = await pool.query(
      `DELETE FROM tags WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async getTagsForDocument(documentId, userId) {
    const docId = parseInt(documentId, 10);
    const uid = parseInt(userId, 10);
    if (isNaN(docId) || isNaN(uid)) return [];
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN document_tags dt ON dt.tag_id = t.id
       WHERE dt.document_id = ? AND t.user_id = ?
       ORDER BY t.name`,
      [docId, uid]
    );
    return rows;
  },

  async setDocumentTags(documentId, tagIds, userId) {
    const docId = parseInt(documentId, 10);
    const uid = parseInt(userId, 10);
    if (isNaN(docId) || isNaN(uid)) return [];
    await pool.query(`DELETE FROM document_tags WHERE document_id = ?`, [docId]);
    if (!tagIds || tagIds.length === 0) return this.getTagsForDocument(docId, uid);

    const requested = [
      ...new Set(
        tagIds
          .map((tagId) => parseInt(tagId, 10))
          .filter((n) => !isNaN(n))
      ),
    ];
    if (requested.length === 0) return this.getTagsForDocument(docId, uid);

    const ph = requested.map(() => "?").join(",");
    const [validRows] = await pool.query(
      `SELECT id FROM tags WHERE user_id = ? AND id IN (${ph})`,
      [uid, ...requested]
    );
    const validIds = validRows.map((r) => r.id);
    if (validIds.length === 0) return this.getTagsForDocument(docId, uid);

    const tuples = validIds.map(() => "(?, ?)").join(", ");
    const flat = validIds.flatMap((tid) => [docId, tid]);
    await pool.query(
      `INSERT INTO document_tags (document_id, tag_id) VALUES ${tuples}`,
      flat
    );
    return this.getTagsForDocument(docId, uid);
  }
};
