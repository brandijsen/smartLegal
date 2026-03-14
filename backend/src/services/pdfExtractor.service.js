import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

export const extractTextFromPdf = async (userId, storedName) => {
  const filePath = path.join(
    process.cwd(),
    "src",
    "uploads",
    "users",
    String(userId),
    storedName
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF not found: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  const data = await pdfParse(dataBuffer);
  return (data.text || "").trim();
};
