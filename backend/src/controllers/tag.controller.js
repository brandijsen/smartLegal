import { TagModel } from "../models/tag.model.js";
import { ensureDefaultTagsForUser } from "../services/scadenzaTags.service.js";

export async function listTags(req, res) {
  try {
    const userId = req.user.id;
    const { limit, search } = req.query;
    let tags = await TagModel.findByUser(userId, { limit, search });
    if (tags.length === 0) {
      await ensureDefaultTagsForUser(userId);
      tags = await TagModel.findByUser(userId, { limit, search });
    }
    return res.json({ tags });
  } catch (err) {
    const msg = err.code === "ER_NO_SUCH_TABLE" || err.message?.includes("doesn't exist")
      ? "Tag tables missing. Run migration: mysql -u root -p invparser < backend/migrations/db.sql"
      : (err.message || "Failed to list tags");
    return res.status(500).json({ message: msg });
  }
}

export async function createTag(req, res) {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tag name is required" });
    }
    const tag = await TagModel.create({
      userId,
      name: name.trim(),
      color: color || null
    });
    return res.status(201).json({ tag });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A tag with this name already exists" });
    }
    return res.status(500).json({ message: err.message || "Failed to create tag" });
  }
}

export async function updateTag(req, res) {
  try {
    const userId = req.user.id;
    const tagId = parseInt(req.params.id, 10);
    const { name, color } = req.body;
    if (isNaN(tagId)) {
      return res.status(400).json({ message: "Invalid tag ID" });
    }
    await TagModel.update(tagId, userId, { name: name?.trim(), color });
    const tags = await TagModel.findByUser(userId, { limit: 500 });
    const tag = tags.find((t) => t.id === tagId);
    return res.json({ tag: tag || { id: tagId, name, color } });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update tag" });
  }
}

export async function deleteTag(req, res) {
  try {
    const userId = req.user.id;
    const tagId = parseInt(req.params.id, 10);
    if (isNaN(tagId)) {
      return res.status(400).json({ message: "Invalid tag ID" });
    }
    const deleted = await TagModel.delete(tagId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Tag not found" });
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete tag" });
  }
}

export async function getDocumentTags(req, res) {
  try {
    const userId = req.user.id;
    const documentId = parseInt(req.params.id, 10);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    const tags = await TagModel.getTagsForDocument(documentId, userId);
    return res.json({ tags });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get document tags" });
  }
}

export async function setDocumentTags(req, res) {
  try {
    const userId = req.user.id;
    const documentId = parseInt(req.params.id, 10);
    const { tag_ids } = req.body;
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    const ids = Array.isArray(tag_ids) ? tag_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)) : [];
    const tags = await TagModel.setDocumentTags(documentId, ids, userId);
    return res.json({ tags });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to set document tags" });
  }
}
