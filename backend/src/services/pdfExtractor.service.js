import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str)
      .join(" ");

    fullText += pageText + "\n";
  }

  return fullText;
};
