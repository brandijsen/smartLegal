/**
 * Auto-assignment of due-date tags based on payment due_date.
 * 7 tags: 60 days, 30 days, 10 days, 1 day, Due today, Overdue, Paid.
 * "Paid" is manual-only; user can only assign it.
 */

import { TagModel } from "../models/tag.model.js";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

const DUE_TAG_DEFS = [
  { name: "60 days", color: "#cbd5e1", key: "due_60" },
  { name: "30 days", color: "#fef08a", key: "due_30" },
  { name: "10 days", color: "#eab308", key: "due_10" },
  { name: "1 day", color: "#f97316", key: "due_1" },
  { name: "Due today", color: "#ef4444", key: "due_0" },
  { name: "Overdue", color: "#dc2626", key: "due_overdue" },
  { name: "Paid", color: "#22c55e", key: "paid" }
];

const PAID_TAG_NAME = "Paid";

// Legacy Italian tags created by mistake - remove to avoid duplicates in filter
const REPLACED_TAG_NAMES = ["60 gg", "30 gg"];

function getVal(obj) {
  if (obj == null) return null;
  if (typeof obj === "object" && "value" in obj) return obj.value ?? null;
  return typeof obj === "string" ? obj : null;
}

function parseDueDate(dueDateStr) {
  if (!dueDateStr || typeof dueDateStr !== "string") return null;
  const trimmed = dueDateStr.trim();
  if (!trimmed) return null;
  // ISO YYYY-MM-DD (priority: avoid wrong interpretation)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or DD-MM-YYYY (European)
  const euMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const y = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    const d = new Date(y, parseInt(month, 10) - 1, parseInt(day, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns which due tag key to assign based on due_date vs today.
 * Returns null if > 60 days (no tag) or no valid due_date.
 */
function getDueTagKey(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = due - today;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "due_overdue";
  if (diffDays === 0) return "due_0";
  if (diffDays === 1) return "due_1";
  if (diffDays >= 2 && diffDays <= 10) return "due_10";
  if (diffDays >= 11 && diffDays <= 30) return "due_30";
  if (diffDays >= 31 && diffDays <= 60) return "due_60";
  return null; // > 60 days: no due tag
}

/**
 * Ensure all due + Paid tags exist for the user.
 */
async function ensureDueTags(userId) {
  const uid = parseInt(userId, 10);
  if (isNaN(uid)) throw new Error("Invalid userId");

  if (REPLACED_TAG_NAMES.length) {
    const ph = REPLACED_TAG_NAMES.map(() => "?").join(",");
    const [delRes] = await pool.query(
      `DELETE FROM tags WHERE user_id = ? AND name IN (${ph})`,
      [uid, ...REPLACED_TAG_NAMES]
    );
    if (delRes?.affectedRows > 0) {
      logger.info("Removed replaced legacy tags", { userId: uid, count: delRes.affectedRows });
    }
  }

  const tuples = DUE_TAG_DEFS.map(() => "(?, ?, ?)").join(", ");
  const insertParams = DUE_TAG_DEFS.flatMap((d) => [uid, d.name, d.color]);
  await pool.query(
    `INSERT IGNORE INTO tags (user_id, name, color) VALUES ${tuples}`,
    insertParams
  );

  const tags = await TagModel.findByUser(uid, { limit: 500 });
  const byName = Object.fromEntries(tags.map((t) => [t.name, t]));
  const result = {};
  for (const def of DUE_TAG_DEFS) {
    const tag = byName[def.name];
    if (!tag) {
      logger.warn("Due tag missing after INSERT IGNORE", { userId: uid, name: def.name });
      continue;
    }
    const tid = parseInt(tag.id, 10);
    if (!isNaN(tid)) result[def.key] = tid;
  }
  return result;
}

/**
 * Create default due tags for user (if they don't exist).
 * Call on first /tags access to ensure tags exist.
 */
export async function ensureDefaultTagsForUser(userId) {
  await ensureDueTags(userId);
}

/**
 * Sync due tag for a single document.
 * If document has "Paid" tag, we do NOT update (user marked as paid).
 */
export async function syncDueDateForDocument(documentId, userId, semantic, options = {}) {
  const tagIds = options.tagIds ?? (await ensureDueTags(userId));
  const currentTags = await TagModel.getTagsForDocument(documentId, userId);

  const hasPaid = currentTags.some((t) => t.name === PAID_TAG_NAME);
  const dueTagIds = new Set(
    DUE_TAG_DEFS.filter((d) => d.key !== "paid").map((d) => tagIds[d.key])
  );

  if (hasPaid) {
    const manualTagIds = currentTags
      .filter((t) => !dueTagIds.has(t.id))
      .map((t) => parseInt(t.id, 10))
      .filter((id) => !isNaN(id));
    await TagModel.setDocumentTags(documentId, manualTagIds, userId);
    return;
  }

  const dueDateStr = getVal(semantic?.due_date);
  const dueDate = parseDueDate(dueDateStr);
  const keyToAssign = getDueTagKey(dueDate);
  const tagIdToAdd = keyToAssign ? tagIds[keyToAssign] : null;

  let newTagIds = currentTags
    .filter((t) => !dueTagIds.has(t.id))
    .map((t) => parseInt(t.id, 10))
    .filter((id) => !isNaN(id));
  if (tagIdToAdd != null) newTagIds.push(parseInt(tagIdToAdd, 10));

  await TagModel.setDocumentTags(documentId, newTagIds, userId);

  if (keyToAssign) {
    logger.debug("Due tag assigned", {
      documentId,
      userId,
      dueDate: dueDateStr,
      tagKey: keyToAssign
    });
  }
}

/**
 * Re-sync due tags for all documents with due_date.
 * Runs periodically to update tags as days pass.
 */
export async function syncDueDatesForAllDocuments() {
  const [rows] = await pool.execute(
    `SELECT d.id AS document_id, d.user_id, dr.parsed_json
     FROM documents d
     JOIN document_results dr ON d.id = dr.document_id
     WHERE dr.parsed_json IS NOT NULL
       AND JSON_EXTRACT(dr.parsed_json, '$.semantic.due_date') IS NOT NULL
       AND d.status = 'done'`
  );

  const byUser = new Map();
  for (const row of rows) {
    const uid = row.user_id;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(row);
  }

  const CONCURRENCY = 1;

  async function processRow(row, tagIds, attempt = 0) {
    try {
      const parsed =
        typeof row.parsed_json === "string" ? JSON.parse(row.parsed_json) : row.parsed_json;
      const semantic = parsed?.semantic;
      if (!semantic) return false;

      await syncDueDateForDocument(row.document_id, row.user_id, semantic, { tagIds });
      return true;
    } catch (err) {
      const isDeadlock =
        err.code === "ER_LOCK_DEADLOCK" || err.errno === 1213 || /deadlock/i.test(err.message || "");
      if (isDeadlock && attempt < 2) {
        await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
        return processRow(row, tagIds, attempt + 1);
      }
      logger.warn("Due tag sync failed for document", {
        documentId: row.document_id,
        error: err.message
      });
      return false;
    }
  }

  let updated = 0;
  for (const [, userRows] of byUser) {
    const tagIds = await ensureDueTags(userRows[0].user_id);
    for (let i = 0; i < userRows.length; i += CONCURRENCY) {
      const chunk = userRows.slice(i, i + CONCURRENCY);
      const ok = await Promise.all(chunk.map((row) => processRow(row, tagIds)));
      updated += ok.filter(Boolean).length;
    }
  }

  return { updated };
}
