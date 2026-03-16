import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const extractTextFromPdf = async (userId, storedName) => {
  const { getFilePath } = await import("../config/upload.js");
  const filePath = getFilePath(userId, storedName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF not found: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  const data = await pdfParse(dataBuffer);
  return (data.text || "").trim();
};
