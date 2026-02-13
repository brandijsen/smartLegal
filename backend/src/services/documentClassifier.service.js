import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function classifyDocument(rawText) {
  try {
    const prompt = `
You are a strict document classification engine for accounting documents.

Classify the document into ONE of the following:

document_type:
- invoice
- receipt
- other

If document_type is "invoice", also provide document_subtype:
- standard
- professional_fee
- reverse_charge
- tax_exempt

Rules:

1. standard:
   - B2B invoice with VAT/GST
   - Issued by a company (SRL, SPA, LLC, GmbH, Inc.)
   - Calculation: Subtotal + VAT = Total

2. professional_fee:
   - Issued by individual professional/freelancer (Dr., Atty., Eng., Arch.)
   - May include withholding tax (ritenuta d'acconto, income tax withholding)
   - May include stamp duty/fees
   - Calculation: Gross + Tax - Withholding + Fees = Net Payable

3. reverse_charge:
   - B2B cross-border invoice (intra-EU or international)
   - VAT 0% or "reverse charge" mention
   - Customer liable for VAT
   - Calculation: Subtotal only (no VAT applied)

4. tax_exempt:
   - VAT-exempt services (medical, education, insurance, etc.)
   - Flat-rate regime (regime forfettario)
   - No VAT line or "VAT exempt" mention
   - Calculation: Total = Subtotal

Other types:
- receipt: simple payment proof, usually no VAT breakdown
- other: contracts, CVs, letters, non-accounting documents

Respond ONLY with valid JSON.
DO NOT use markdown.
DO NOT wrap in backticks.

JSON FORMAT:
{
  "document_type": "invoice | receipt | other",
  "document_subtype": "standard | professional_fee | reverse_charge | tax_exempt | null"
}

Document text:
"""
${rawText.slice(0, 4000)}
"""
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = res.choices[0].message.content.trim();

    return JSON.parse(content);
  } catch (error) {
    console.error("❌ AI Classifier error:", error.message);
    
    // Fallback: classify as "other"
    return {
      document_type: "other",
      document_subtype: null
    };
  }
}
