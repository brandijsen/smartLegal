/**
 * Helper per estrarre valori da campi che possono essere:
 * - Semplici: "5050.00" o 22
 * - Con confidence: { value: "5050.00", confidence: 95 }
 */

export function extractValue(field) {
  if (field === null || field === undefined) return null;
  
  // Se è un oggetto con value, estrai value
  if (typeof field === "object" && "value" in field) {
    return field.value;
  }
  
  // Altrimenti ritorna direttamente
  return field;
}

/**
 * Estrae value da un nested object (es: amounts.vat.rate)
 */
export function extractNestedValue(obj, path) {
  if (!obj || !path) return null;
  
  const keys = path.split(".");
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  
  return extractValue(current);
}

/**
 * Normalizza l'intero amounts object per compatibilità
 * Converte { value, confidence } → value
 */
export function normalizeAmounts(amounts) {
  if (!amounts) return null;
  
  const normalized = {};
  
  for (const [key, value] of Object.entries(amounts)) {
    if (value === null || value === undefined) {
      normalized[key] = null;
    } else if (typeof value === "object" && "value" in value) {
      // Ha confidence, estrai value
      normalized[key] = value.value;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // È un oggetto nested (es: vat: { rate, amount })
      normalized[key] = normalizeAmounts(value);
    } else {
      // Valore semplice
      normalized[key] = value;
    }
  }
  
  return normalized;
}
