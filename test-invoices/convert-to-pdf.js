import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlFiles = [
  '1-standard-invoice.html',
  '2-professional-fee.html',
  '3-reverse-charge.html',
  '4-tax-exempt.html'
];

async function convertHtmlToPdf() {
  console.log('🚀 Starting HTML to PDF conversion...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const htmlFile of htmlFiles) {
    try {
      const htmlPath = path.join(__dirname, htmlFile);
      const pdfPath = path.join(__dirname, htmlFile.replace('.html', '.pdf'));

      if (!fs.existsSync(htmlPath)) {
        console.log(`⚠️  ${htmlFile} not found, skipping...`);
        continue;
      }

      console.log(`📄 Converting ${htmlFile}...`);

      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0'
      });

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      console.log(`✅ Created ${path.basename(pdfPath)}`);
      await page.close();

    } catch (error) {
      console.error(`❌ Error converting ${htmlFile}:`, error.message);
    }
  }

  await browser.close();
  console.log('🎉 Conversion complete!');
}

convertHtmlToPdf().catch(console.error);
