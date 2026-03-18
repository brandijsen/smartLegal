import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// Import lib directly to skip index.js self-test (reads ./test/data/05-versions-space.pdf)
const pdfParseFn = require("pdf-parse/lib/pdf-parse.js");

export const extractTextFromPdf = async (userId, storedName) => {
  const { getFilePath } = await import("../config/upload.js");
  const filePath = getFilePath(userId, storedName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF not found: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  const data = await pdfParseFn(dataBuffer);
  return (data.text || "").trim();
};
