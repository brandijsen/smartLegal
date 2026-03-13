import OpenAI from "openai";
import { logExternalAPI, logError } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractSemanticData({
  rawText,
  regexData,
  document_subtype,
}) {
  const startTime = Date.now();
  
  try {
    logExternalAPI("openai", "semantic_extraction_started", { 
      document_subtype,
      textLength: rawText.length 
    });

    const baseRules = `
You extract accounting data from invoices.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no backticks
- Use dot as decimal separator
- Currency: detect from document (EUR, USD, GBP, etc.)
- Extract ONLY present values (omit fields if not found)
- DO NOT calculate or infer values

CONFIDENCE SCORING:
For EACH field you extract, add a "confidence" score (0-100):
- 90-100: Explicitly stated in document, clear and unambiguous
- 70-89: Clearly present but requires minor interpretation
- 50-69: Inferred from context or partially ambiguous
- 0-49: Very uncertain or missing (avoid extracting if confidence is this low)

DOCUMENT IDENTIFICATION (for all invoices):
- invoice_number: the invoice/document number (e.g. "FATT-2025-001", "INV-45", "2025/1234")
- invoice_date: the invoice issue date (prefer format YYYY-MM-DD for consistency)
- due_date: MANDATORY when present. Payment due date. Look for: "Scadenza", "Scadenza pagamento", "Pagamento entro", "Due Date", "Payment due", "Scadenza: DD/MM/YYYY". ALWAYS return as YYYY-MM-DD (convert DD/MM/YYYY: day=first number, month=second, year=third). Example: "Scadenza: 10/04/2026" → "2026-04-10".

SELLER (for all invoices - the issuer/emittente):
Always extract the SELLER (company or person who issued the invoice):
- seller.name: company or person name
- seller.vat_number: VAT number (IT..., EU..., etc.)
- seller.address: full address if present (optional)
Extract EXACTLY as written on the document.

LINE ITEMS (when the invoice has an item table):
If the document has a clear table/list of items (description, quantity, unit price, amount), extract as line_items array.
Each item: { "description": "...", "quantity": number, "unit_price": "0.00", "amount": "0.00" }
- Omit line_items if no item table is present
- Max 30 items; use dot as decimal separator
`;

    // Define rules and JSON structure per subtype
    let specificRules = "";
    let jsonStructure = "";

    if (document_subtype === "professional_fee") {
      specificRules = `
DOCUMENT SUBTYPE: PROFESSIONAL FEE (Parcella)

Extract these fields (if present):
- due_date: CRITICAL. Look for "Scadenza:", "Scadenza pagamento", "Pagamento entro". Italian format DD/MM/YYYY → convert to YYYY-MM-DD.
- gross_fee: base fee before taxes
- vat: { rate, amount } (if applicable)
- withholding_tax: { rate, amount } (income tax withheld)
- stamp_duty: { present: boolean, amount } (administrative fee)
- net_payable: final amount to pay
- line_items: array of items when fee is itemized (optional)

Calculation flow: Gross + VAT - Withholding + Stamp = Net Payable
`;
      jsonStructure = `
{
  "invoice_number": { "value": "2025/001", "confidence": 98 },
  "invoice_date": { "value": "2025-01-15", "confidence": 95 },
  "due_date": { "value": "2025-02-15", "confidence": 90 },
  "seller": {
    "name": { "value": "Studio Rossi Avvocati", "confidence": 95 },
    "vat_number": { "value": "IT12345678901", "confidence": 98 },
    "address": { "value": "Via Roma 1, 20100 Milano", "confidence": 85 }
  },
  "amounts": {
    "gross_fee": { "value": "1000.00", "confidence": 95 },
    "vat": { 
      "rate": { "value": 22, "confidence": 98 }, 
      "amount": { "value": "220.00", "confidence": 95 }
    },
    "withholding_tax": { 
      "rate": { "value": 20, "confidence": 92 }, 
      "amount": { "value": "200.00", "confidence": 92 }
    },
    "stamp_duty": { 
      "present": { "value": true, "confidence": 98 }, 
      "amount": { "value": "2.00", "confidence": 95 }
    },
    "net_payable": { "value": "1022.00", "confidence": 96 },
    "currency": { "value": "EUR", "confidence": 100 }
  },
  "line_items": [
    { "description": "Parcella gennaio 2025", "quantity": 1, "unit_price": "1000.00", "amount": "1000.00" }
  ]
}
`;
    } else if (document_subtype === "reverse_charge") {
      specificRules = `
DOCUMENT SUBTYPE: REVERSE CHARGE (Cross-border B2B)

Extract ONLY these fields (if present):
- subtotal: net amount before tax
- total_amount: usually same as subtotal (no VAT applied by seller)
- line_items: array of items when item table is present

Note: VAT 0% or not applicable (buyer liable for VAT)
`;
      jsonStructure = `
{
  "invoice_number": { "value": "DE-2025-045", "confidence": 98 },
  "invoice_date": { "value": "2025-01-10", "confidence": 95 },
  "due_date": { "value": "2025-02-10", "confidence": 90 },
  "seller": {
    "name": { "value": "Tech Corp EU GmbH", "confidence": 95 },
    "vat_number": { "value": "DE123456789", "confidence": 98 },
    "address": { "value": "Berliner Str. 1, 10115 Berlin", "confidence": 85 }
  },
  "amounts": {
    "subtotal": { "value": "5000.00", "confidence": 95 },
    "total_amount": { "value": "5000.00", "confidence": 95 },
    "currency": { "value": "EUR", "confidence": 100 }
  },
  "line_items": [
    { "description": "Software license", "quantity": 1, "unit_price": "5000.00", "amount": "5000.00" }
  ]
}
`;
    } else if (document_subtype === "tax_exempt") {
      specificRules = `
DOCUMENT SUBTYPE: TAX EXEMPT

Extract ONLY these fields (if present):
- subtotal: net amount
- total_amount: usually same as subtotal (no VAT/tax)
- line_items: array of items when item table is present

Note: VAT-exempt services or flat-rate regime
`;
      jsonStructure = `
{
  "invoice_number": { "value": "MB/2025-003", "confidence": 98 },
  "invoice_date": { "value": "2025-01-20", "confidence": 95 },
  "due_date": { "value": "2025-02-20", "confidence": 90 },
  "seller": {
    "name": { "value": "Dott. Mario Bianchi", "confidence": 95 },
    "vat_number": { "value": "IT09876543210", "confidence": 90 }
  },
  "amounts": {
    "subtotal": { "value": "3000.00", "confidence": 95 },
    "total_amount": { "value": "3000.00", "confidence": 95 },
    "currency": { "value": "EUR", "confidence": 100 }
  },
  "line_items": [
    { "description": "Visita specialistica", "quantity": 1, "unit_price": "3000.00", "amount": "3000.00" }
  ]
}
`;
    } else {
      // standard (default)
      specificRules = `
DOCUMENT SUBTYPE: STANDARD INVOICE (B2B with VAT)

Extract ONLY these fields (if present):
- subtotal: net amount before tax
- vat: { rate, amount }
- total_amount: final amount including VAT
- line_items: array of items when item table is present

Calculation flow: Subtotal + VAT = Total
`;
      jsonStructure = `
{
  "invoice_number": { "value": "FATT-2025-045", "confidence": 98 },
  "invoice_date": { "value": "2025-01-15", "confidence": 95 },
  "due_date": { "value": "2025-02-15", "confidence": 90 },
  "seller": {
    "name": { "value": "Acme SRL", "confidence": 95 },
    "vat_number": { "value": "IT12345678901", "confidence": 98 },
    "address": { "value": "Via Torino 10, 10121 Milano", "confidence": 85 }
  },
  "amounts": {
    "subtotal": { "value": "5050.00", "confidence": 95 },
    "vat": { 
      "rate": { "value": 22, "confidence": 98 }, 
      "amount": { "value": "1111.00", "confidence": 95 }
    },
    "total_amount": { "value": "6161.00", "confidence": 96 },
    "currency": { "value": "EUR", "confidence": 100 }
  },
  "line_items": [
    { "description": "Servizio consulenza", "quantity": 1, "unit_price": "3000.00", "amount": "3000.00" },
    { "description": "Implementazione software", "quantity": 1, "unit_price": "2050.00", "amount": "2050.00" }
  ]
}
`;
    }

    const dueDateHint = regexData?.due_date_hint;
    const dueDateInstruction = dueDateHint
      ? `\nDUE DATE HINT: Regex detected "Scadenza" or similar with date "${dueDateHint}". This is the payment due date. Convert to YYYY-MM-DD (DD/MM/YYYY → year=3rd, month=2nd, day=1st) and include as due_date.\n`
      : "";

    const prompt = `
${baseRules}
${specificRules}
${dueDateInstruction}

Regex-extracted hints:
${JSON.stringify(regexData)}

Document text:
"""
${rawText.slice(0, 4000)}
"""

Return JSON with ONLY the fields you find. Example structure:
${jsonStructure}

CRITICAL: 
- If the document shows a payment due date (Scadenza, Due date, Payment due, etc.), you MUST extract it as due_date in YYYY-MM-DD format.
- Omit fields that are not present in the document.
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o",  // Upgraded from gpt-4o-mini for better accuracy
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = res.choices[0].message.content.trim();
    const duration = Date.now() - startTime;

    logExternalAPI("openai", "semantic_extraction_completed", { 
      document_subtype,
      duration: `${duration}ms`,
      tokens: res.usage?.total_tokens
    });

    return JSON.parse(content);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError(error, {
      operation: "extractSemanticData",
      service: "openai",
      document_subtype,
      duration: `${duration}ms`
    });
    
    // Fallback: minimal structure
    return {
      amounts: {
        currency: "EUR"
      }
    };
  }
}
