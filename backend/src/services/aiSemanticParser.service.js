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
`;

    // Define rules and JSON structure per subtype
    let specificRules = "";
    let jsonStructure = "";

    if (document_subtype === "professional_fee") {
      specificRules = `
DOCUMENT SUBTYPE: PROFESSIONAL FEE

Extract ONLY these fields (if present):
- gross_fee: base fee before taxes
- vat: { rate, amount } (if applicable)
- withholding_tax: { rate, amount } (income tax withheld)
- stamp_duty: { present: boolean, amount } (administrative fee)
- net_payable: final amount to pay

Calculation flow: Gross + VAT - Withholding + Stamp = Net Payable
`;
      jsonStructure = `
{
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
  }
}
`;
    } else if (document_subtype === "reverse_charge") {
      specificRules = `
DOCUMENT SUBTYPE: REVERSE CHARGE (Cross-border B2B)

Extract ONLY these fields (if present):
- subtotal: net amount before tax
- total_amount: usually same as subtotal (no VAT applied by seller)

Note: VAT 0% or not applicable (buyer liable for VAT)
`;
      jsonStructure = `
{
  "amounts": {
    "subtotal": { "value": "5000.00", "confidence": 95 },
    "total_amount": { "value": "5000.00", "confidence": 95 },
    "currency": { "value": "EUR", "confidence": 100 }
  }
}
`;
    } else if (document_subtype === "tax_exempt") {
      specificRules = `
DOCUMENT SUBTYPE: TAX EXEMPT

Extract ONLY these fields (if present):
- subtotal: net amount
- total_amount: usually same as subtotal (no VAT/tax)

Note: VAT-exempt services or flat-rate regime
`;
      jsonStructure = `
{
  "amounts": {
    "subtotal": { "value": "3000.00", "confidence": 95 },
    "total_amount": { "value": "3000.00", "confidence": 95 },
    "currency": { "value": "EUR", "confidence": 100 }
  }
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

Calculation flow: Subtotal + VAT = Total
`;
      jsonStructure = `
{
  "amounts": {
    "subtotal": { "value": "5050.00", "confidence": 95 },
    "vat": { 
      "rate": { "value": 22, "confidence": 98 }, 
      "amount": { "value": "1111.00", "confidence": 95 }
    },
    "total_amount": { "value": "6161.00", "confidence": 96 },
    "currency": { "value": "EUR", "confidence": 100 }
  }
}
`;
    }

    const prompt = `
${baseRules}
${specificRules}

Regex-extracted hints:
${JSON.stringify(regexData)}

Document text:
"""
${rawText.slice(0, 4000)}
"""

Return JSON with ONLY the fields you find. Example structure:
${jsonStructure}

IMPORTANT: Omit fields that are not present in the document.
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
