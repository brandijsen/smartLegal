export function sanitizeAndParseJson(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI response is empty or invalid");
  }

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }

  const jsonString = cleaned.slice(firstBrace, lastBrace + 1);

  return JSON.parse(jsonString);
}
