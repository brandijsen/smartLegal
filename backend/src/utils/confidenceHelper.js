/**
 * Analizza i dati parsed e identifica i campi con confidence score < 70% (red flags)
 * Restituisce un array di campi problematici per la visualizzazione nell'UI
 */

const CONFIDENCE_THRESHOLD = 70;

/**
 * Estrae tutti i campi con il loro confidence score da un oggetto nested
 */
function extractFieldsWithConfidence(obj, path = "") {
  const fields = [];

  function traverse(current, currentPath) {
    if (!current || typeof current !== "object") return;

    // Se ha value e confidence, è un campo
    if ("value" in current && "confidence" in current) {
      fields.push({
        path: currentPath,
        value: current.value,
        confidence: current.confidence,
      });
      return;
    }

    // Altrimenti continua a traversare
    for (const [key, value] of Object.entries(current)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      traverse(value, newPath);
    }
  }

  traverse(obj, path);
  return fields;
}

/**
 * Identifica i red flags (confidence < threshold)
 */
export function identifyRedFlags(parsedJson, threshold = CONFIDENCE_THRESHOLD) {
  if (!parsedJson) return [];

  const allFields = extractFieldsWithConfidence(parsedJson);
  
  const redFlags = allFields.filter(
    (field) => field.confidence < threshold
  );

  return redFlags.map((field) => ({
    ...field,
    severity: getSeverity(field.confidence),
    label: formatFieldLabel(field.path),
  }));
}

/**
 * Determina la severity in base al confidence score
 */
function getSeverity(confidence) {
  if (confidence < 50) return "critical"; // 🔴 Molto problematico
  if (confidence < 60) return "high";     // 🟠 Problematico
  if (confidence < 70) return "medium";   // 🟡 Da verificare
  return "low";                            // 🟢 OK
}

/**
 * Formatta il path del campo in una label leggibile
 * es: "amounts.vat.rate" → "VAT Rate"
 */
function formatFieldLabel(path) {
  return path
    .split(".")
    .map((part) => {
      // Rimuovi underscore e converti in Title Case
      return part
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    })
    .join(" > ");
}

/**
 * Calcola il confidence score medio di un documento
 */
export function calculateAverageConfidence(parsedJson) {
  if (!parsedJson) return 100;

  const allFields = extractFieldsWithConfidence(parsedJson);
  
  if (allFields.length === 0) return 100;

  const sum = allFields.reduce((acc, field) => acc + field.confidence, 0);
  return Math.round(sum / allFields.length);
}

/**
 * Verifica se un documento ha red flags
 */
export function hasRedFlags(parsedJson, threshold = CONFIDENCE_THRESHOLD) {
  const redFlags = identifyRedFlags(parsedJson, threshold);
  return redFlags.length > 0;
}

/**
 * Aggiorna un campo specifico nel parsed_json
 */
export function updateFieldValue(parsedJson, fieldPath, newValue) {
  const pathParts = fieldPath.split(".");
  const result = JSON.parse(JSON.stringify(parsedJson)); // Deep clone

  let current = result;
  
  // Naviga fino al campo target
  for (let i = 0; i < pathParts.length - 1; i++) {
    if (!current[pathParts[i]]) {
      current[pathParts[i]] = {};
    }
    current = current[pathParts[i]];
  }

  const lastKey = pathParts[pathParts.length - 1];
  
  // Se il campo ha structure { value, confidence }, aggiorna solo value
  if (current[lastKey] && typeof current[lastKey] === "object" && "value" in current[lastKey]) {
    current[lastKey].value = newValue;
    // Impostiamo confidence a 100 per campi editati manualmente
    current[lastKey].confidence = 100;
  } else {
    // Altrimenti sostituisci direttamente
    current[lastKey] = { value: newValue, confidence: 100 };
  }

  return result;
}
