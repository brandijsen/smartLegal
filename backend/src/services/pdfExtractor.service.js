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

  console.log(`📄 Extracting PDF: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF not found: ${filePath}`);
  }

  try {
    const dataBuffer = fs.readFileSync(filePath);
    console.log(`📊 File size: ${dataBuffer.length} bytes`);
    
    const uint8Array = new Uint8Array(dataBuffer);
    
    console.log(`🔍 Loading PDF document...`);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      standardFontDataUrl: null,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`📖 PDF has ${numPages} pages`);
    
    let fullText = "";

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`📃 Processing page ${pageNum}/${numPages}...`);
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
      console.log(`📝 Page ${pageNum} extracted: ${pageText.length} chars`);
    }

    console.log(`✅ Total text extracted: ${fullText.length} chars`);
    return fullText.trim();
  } catch (error) {
    console.error(`❌ PDF extraction error for ${storedName}:`, error);
    console.error(`Stack trace:`, error.stack);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
