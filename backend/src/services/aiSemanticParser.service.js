import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractSemanticData({
  rawText,
  regexData,
  document_subtype,
}) {
  try {
    const baseRules = `
You extract accounting data from invoices.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no backticks
- Use dot as decimal separator
- Currency: detect from document (EUR, USD, GBP, etc.)
- Extract ONLY present values (omit fields if not found)
- DO NOT calculate or infer values
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
    "gross_fee": "1000.00",
    "vat": { "rate": 22, "amount": "220.00" },
    "withholding_tax": { "rate": 20, "amount": "200.00" },
    "stamp_duty": { "present": true, "amount": "2.00" },
    "net_payable": "1022.00",
    "currency": "EUR"
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
    "subtotal": "5000.00",
    "total_amount": "5000.00",
    "currency": "EUR"
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
    "subtotal": "3000.00",
    "total_amount": "3000.00",
    "currency": "EUR"
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
    "subtotal": "5050.00",
    "vat": { "rate": 22, "amount": "1111.00" },
    "total_amount": "6161.00",
    "currency": "EUR"
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = res.choices[0].message.content.trim();

    return JSON.parse(content);
  } catch (error) {
    console.error("❌ AI Semantic Parser error:", error.message);
    
    // Fallback: minimal structure
    return {
      amounts: {
        currency: "EUR"
      }
    };
  }
}
