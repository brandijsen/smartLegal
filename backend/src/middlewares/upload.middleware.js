import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getUploadDir } from "../config/upload.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const uploadPath = getUploadDir(userId);

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = crypto.randomUUID() + ext;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"), false);
  }
  cb(null, true);
};

export const uploadPDF = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ───────────────────────────────────────────────
// AVATAR UPLOAD
// ───────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const uploadPath = getUploadDir(userId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : ".jpg";
    cb(null, `avatar_${crypto.randomUUID()}${safeExt}`);
  },
});

const avatarFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo JPEG, PNG e WebP sono consentiti"), false);
  }
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
