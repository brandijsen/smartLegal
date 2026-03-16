import path from "path";

const UPLOAD_BASE = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "src", "uploads");

export const getUploadDir = (userId) =>
  path.join(UPLOAD_BASE, "users", String(userId));

export const getFilePath = (userId, storedName) =>
  path.join(UPLOAD_BASE, "users", String(userId), storedName);
