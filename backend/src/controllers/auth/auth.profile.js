import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { User } from "../../models/user.model.js";
import {
  sendProfileUpdatedEmail,
  sendPasswordChangedEmail,
} from "../../services/email.service.js";
import { pool } from "../../config/db.js";
import { getFilePath } from "../../config/upload.js";
import { logAuth, logError } from "../../utils/logger.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { validatePassword } from "../../utils/passwordValidator.js";
import { invalidateUserAuthCache } from "../../utils/userAuthCache.js";
import { toSafeUser } from "./auth.shared.js";

export const updateProfile = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail !== req.user.email) {
      const existing = await User.findByEmail(trimmedEmail);
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const oldName = req.user.name;
    const oldEmail = req.user.email;

    await User.updateProfile(userId, { name: name.trim(), email: trimmedEmail });
    const updated = await User.findById(userId);
    invalidateUserAuthCache(userId);
    logAuth("profile_updated", { userId, email: trimmedEmail });

    const changes = [];
    if (name.trim() !== oldName) changes.push(`Name: ${oldName} → ${name.trim()}`);
    if (trimmedEmail !== oldEmail) changes.push(`Email: ${oldEmail} → ${trimmedEmail}`);
    sendProfileUpdatedEmail(
      trimmedEmail,
      name.trim(),
      changes.length ? changes.join("<br>") : null
    ).catch(() => {});

    return res.json(toSafeUser(updated));
  } catch (err) {
    logError(err, { operation: "updateProfile", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.message });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "You signed up with Google. Use forgot password to set one.",
      });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Current password is wrong" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashed);
    await User.incrementRefreshTokenVersion(user.id);
    invalidateUserAuthCache(user.id);

    logAuth("password_changed", { userId: user.id });

    sendPasswordChangedEmail(user.email, user.name).catch(() => {});

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    logError(err, { operation: "changePassword", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

export const exportData = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.execute(
      "SELECT id, name, email, verified, created_at FROM users WHERE id = ?",
      [userId]
    );
    const profile = userRows[0];
    if (!profile) return res.status(404).json({ message: "User not found" });

    const [docRows] = await pool.execute(
      `SELECT d.id, d.original_name, d.status, d.uploaded_at, d.processed_at, d.is_defective,
              dr.raw_text, dr.parsed_json, dr.manually_edited, dr.edited_at
       FROM documents d
       LEFT JOIN document_results dr ON d.id = dr.document_id
       WHERE d.user_id = ?
       ORDER BY d.uploaded_at DESC`,
      [userId]
    );

    const [supplierRows] = await pool.execute(
      "SELECT id, name, vat_number, address, email, created_at FROM suppliers WHERE user_id = ?",
      [userId]
    );

    const [tagRows] = await pool.execute(
      "SELECT id, name, color, created_at FROM tags WHERE user_id = ?",
      [userId]
    );

    const safeParsedJson = (val) => {
      if (val == null) return null;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    const exportPayload = {
      exported_at: new Date().toISOString(),
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        verified: profile.verified,
        created_at: profile.created_at,
      },
      documents: docRows.map((d) => ({
        id: d.id,
        original_name: d.original_name,
        status: d.status,
        uploaded_at: d.uploaded_at,
        processed_at: d.processed_at,
        is_defective: d.is_defective,
        raw_text: d.raw_text,
        parsed_json: safeParsedJson(d.parsed_json),
        manually_edited: d.manually_edited,
        edited_at: d.edited_at,
      })),
      suppliers: supplierRows,
      tags: tagRows,
    };

    logAuth("data_exported", { userId });

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invparser-data-${userId}-${Date.now()}.json"`
    );
    return res.json(exportPayload);
  } catch (err) {
    logError(err, { operation: "exportData", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

export const uploadAvatar = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const oldPath = req.user.avatar_path;
    const filename = req.file.filename;

    if (oldPath) {
      const oldFullPath = getFilePath(userId, oldPath);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }

    await User.updateAvatar(userId, filename);
    const updated = await User.findById(userId);
    invalidateUserAuthCache(userId);

    logAuth("avatar_updated", { userId });

    return res.json(toSafeUser(updated));
  } catch (err) {
    logError(err, { operation: "uploadAvatar", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

export const getAvatar = async (req, res) => {
  try {
    const avatarPath = req.user?.avatar_path;
    if (!avatarPath) {
      return res.status(404).json({ message: "No avatar" });
    }

    const fullPath = getFilePath(req.user.id, avatarPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    const ext = path.extname(avatarPath).toLowerCase();
    const types = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    res.type(types[ext] || "image/jpeg");
    res.sendFile(fullPath);
  } catch (err) {
    logError(err, { operation: "getAvatar", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};
