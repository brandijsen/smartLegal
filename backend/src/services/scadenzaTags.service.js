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

// Tag italiani creati per errore – rimuovi per evitare duplicati nel filtro
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
  // ISO YYYY-MM-DD (priorità: evita interpretazione errata)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or DD-MM-YYYY (europeo)
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
  for (const oldName of REPLACED_TAG_NAMES) {
    const [r] = await pool.query(
      `DELETE FROM tags WHERE user_id = ? AND name = ?`,
      [uid, oldName]
    );
    if (r?.affectedRows > 0) {
      logger.info("Removed replaced tag", { userId: uid, name: oldName });
    }
  }
  const tags = await TagModel.findByUser(uid, { limit: 500 });
  const byName = Object.fromEntries(tags.map((t) => [t.name, t]));
  const result = {};

  for (const def of DUE_TAG_DEFS) {
    let tag = byName[def.name];
    if (!tag) {
      try {
        tag = await TagModel.create({
          userId: uid,
          name: def.name,
          color: def.color
        });
        logger.info("Created due tag", { userId: uid, tagId: tag.id, name: def.name });
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
          const refreshed = await TagModel.findByUser(uid, { limit: 500 });
          tag = refreshed.find((t) => t.name === def.name);
          if (!tag) throw err;
        } else {
          throw err;
        }
      }
      byName[def.name] = tag;
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
export async function syncScadenzaForDocument(documentId, userId, semantic) {
  const tagIds = await ensureDueTags(userId);
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
export async function syncScadenzaForAllDocuments() {
  const [rows] = await pool.execute(
    `SELECT d.id AS document_id, d.user_id, dr.parsed_json
     FROM documents d
     JOIN document_results dr ON d.id = dr.document_id
     WHERE dr.parsed_json IS NOT NULL
       AND JSON_EXTRACT(dr.parsed_json, '$.semantic.due_date') IS NOT NULL
       AND d.status = 'done'`
  );

  let updated = 0;
  for (const row of rows) {
    try {
      const parsed =
        typeof row.parsed_json === "string" ? JSON.parse(row.parsed_json) : row.parsed_json;
      const semantic = parsed?.semantic;
      if (!semantic) continue;

      await syncScadenzaForDocument(row.document_id, row.user_id, semantic);
      updated++;
    } catch (err) {
      logger.warn("Due tag sync failed for document", {
        documentId: row.document_id,
        error: err.message
      });
    }
  }

  return { updated };
}
