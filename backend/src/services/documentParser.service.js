/**
 * Estrae informazioni strutturate da testo PDF
 * Versione deterministica (REGEX)
 * Estendibile con AI in step successivo
 */
export const parseDocument = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return {};
  }

  const text = rawText.replace(/\s+/g, " ").trim();

  return {
    amounts: extractAmounts(text),
    dates: extractDates(text),
    due_date_hint: extractDueDateHint(text),
    vat_numbers: extractVatNumbers(text),
    emails: extractEmails(text),
    phones: extractPhones(text),
    document_numbers: extractDocumentNumbers(text),
  };
};

/* ----------------------- */
/* REGEX HELPERS */
/* ----------------------- */

const extractAmounts = (text) => {
  const regex = /(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})\s?(€|EUR))/gi;
  return unique(text.match(regex));
};

const extractDates = (text) => {
  const regex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
  return unique(text.match(regex));
};

/** Extracts date near "Scadenza", "Due date", "Payment due" etc. for AI hint */
const extractDueDateHint = (text) => {
  const patterns = [
    /Scadenza\s*(?:pagamento)?\s*[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /Pagamento\s+entro\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /Data\s+scadenza\s*[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /Due\s+[Dd]ate\s*[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /Payment\s+due\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Fällig|Scad\.)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
};

const extractVatNumbers = (text) => {
  const regex = /\bIT\s?\d{11}\b/gi;
  return unique(text.match(regex));
};

const extractEmails = (text) => {
  const regex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  return unique(text.match(regex));
};

const extractPhones = (text) => {
  const regex = /(\+?\d{1,3})?\s?\d{2,4}[\s.-]?\d{3}[\s.-]?\d{4}/g;
  return unique(text.match(regex));
};

const extractDocumentNumbers = (text) => {
  const regex = /\b(FAT|INV|DOC|NR|N°)[\s\-:]?[A-Z0-9\/\-]{3,}\b/gi;
  return unique(text.match(regex));
};

/* ----------------------- */
/* UTILS */
/* ----------------------- */

const unique = (matches) => {
  if (!matches) return [];
  return [...new Set(matches.map(m => m.trim()))];
};
