import fs from 'fs';
import PDFDocument from 'pdfkit';

// Crea un documento PDF generico (NON fattura)
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('generic-letter-not-invoice.pdf'));

// Header
doc.fontSize(20).text('Generic Business Letter', { align: 'center' });
doc.moveDown();

// Date
doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
doc.moveDown(2);

// Recipient
doc.text('Dear Valued Customer,');
doc.moveDown();

// Body
doc.fontSize(11).text(
  'This is a generic business letter to inform you about our company policies ' +
  'and upcoming changes. This document is NOT an invoice, receipt, or any accounting document.',
  { align: 'justify' }
);
doc.moveDown();

doc.text(
  'We would like to take this opportunity to thank you for your continued support ' +
  'and loyalty. Our team is committed to providing you with the best service possible.',
  { align: 'justify' }
);
doc.moveDown(2);

// Signature
doc.text('Best regards,');
doc.moveDown();
doc.text('John Doe');
doc.text('General Manager');
doc.text('Example Corporation Inc.');
doc.moveDown(2);

// Footer note
doc.fontSize(9).text(
  'This is a courtesy letter and does not constitute a financial document. ' +
  'No payment is required. This is NOT an invoice.',
  { align: 'center', color: 'gray' }
);

doc.end();

console.log('✅ PDF generico creato: generic-letter-not-invoice.pdf');
