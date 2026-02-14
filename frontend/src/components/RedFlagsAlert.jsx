import { FiAlertTriangle, FiAlertCircle } from "react-icons/fi";

/**
 * Componente per visualizzare i campi con bassa confidence (red flags)
 * + VALIDATION FLAGS (errori matematici/logici)
 * Mostra sia i campi problematici che richiedono verifica manuale
 */

const RedFlagsAlert = ({ parsed, validationFlags }) => {
  if (!parsed) return null;

  // ✅ NEW: Combina confidence-based red flags + validation flags
  const confidenceRedFlags = identifyRedFlags(parsed);
  const combinedFlags = mergeFlags(confidenceRedFlags, validationFlags || []);

  if (combinedFlags.length === 0) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
          <FiAlertTriangle className="w-6 h-6 text-amber-700" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Verification Needed
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            {combinedFlags.length} issue{combinedFlags.length > 1 ? "s" : ""} detected. 
            Please review and mark document as defective if needed.
          </p>

          {/* Lista campi problematici */}
          <div className="space-y-3">
            {combinedFlags.map((field, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-amber-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <FiAlertCircle className={`w-4 h-4 shrink-0 ${getSeverityColor(field.severity).text}`} />
                      <span className="text-sm font-medium text-slate-900">
                        {field.label}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(field.severity).badge}`}
                      >
                        {field.type === "validation" ? (
                          field.severity.toUpperCase()
                        ) : (
                          `${field.confidence}% confident`
                        )}
                      </span>
                    </div>

                    {/* ✅ NEW: Mostra messaggio per validation flags */}
                    {field.message && (
                      <div className="text-sm text-slate-700 mb-2">
                        {field.message}
                      </div>
                    )}

                    {/* ✅ NEW: Mostra expected vs actual se disponibile */}
                    {field.expected && field.actual && (
                      <div className="text-xs text-slate-600 mb-2 space-y-1">
                        <div>
                          <span className="font-medium">Expected:</span> €{field.expected}
                        </div>
                        <div>
                          <span className="font-medium">Actual:</span> €{field.actual}
                        </div>
                      </div>
                    )}

                    {/* Valore estratto (solo per confidence flags) */}
                    {field.value !== undefined && (
                      <div className="text-sm text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded border border-slate-200">
                        {formatValue(field.value)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Helper Functions =====

/**
 * Estrae i campi con confidence score da un oggetto nested
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
 * Identifica i red flags (confidence < 70%)
 */
function identifyRedFlags(parsedJson, threshold = 70) {
  if (!parsedJson) return [];

  const allFields = extractFieldsWithConfidence(parsedJson);

  const redFlags = allFields.filter((field) => field.confidence < threshold);

  return redFlags.map((field) => ({
    ...field,
    severity: getSeverity(field.confidence),
    label: formatFieldLabel(field.path),
    type: "confidence", // ✅ NEW: tipo flag
  }));
}

/**
 * ✅ NEW: Merge confidence-based flags con validation flags
 */
function mergeFlags(confidenceFlags, validationFlags) {
  const merged = [...confidenceFlags];

  // Aggiungi validation flags con formato uniforme
  validationFlags.forEach((vFlag) => {
    merged.push({
      path: vFlag.field,
      label: vFlag.field ? formatFieldLabel(vFlag.field) : "Unknown Field",
      severity: vFlag.severity || "medium",
      confidence: null, // N/A per validation flags
      message: vFlag.message,
      type: "validation", // ✅ tipo validation
      expected: vFlag.expected,
      actual: vFlag.actual,
    });
  });

  // Ordina per severity (critical > high > medium > low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  merged.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return merged;
}

/**
 * Determina la severity in base al confidence score
 */
function getSeverity(confidence) {
  if (confidence < 50) return "critical";
  if (confidence < 60) return "high";
  if (confidence < 70) return "medium";
  return "low";
}

/**
 * Colori per severity
 */
function getSeverityColor(severity) {
  const colors = {
    critical: {
      badge: "bg-red-100 text-red-700 border border-red-200",
      text: "text-red-600",
    },
    high: {
      badge: "bg-orange-100 text-orange-700 border border-orange-200",
      text: "text-orange-600",
    },
    medium: {
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      text: "text-amber-600",
    },
    low: {
      badge: "bg-slate-100 text-slate-700 border border-slate-200",
      text: "text-slate-600",
    },
  };

  return colors[severity] || colors.low;
}

/**
 * Formatta il path del campo in una label leggibile
 */
function formatFieldLabel(path) {
  return path
    .split(".")
    .map((part) => {
      return part
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    })
    .join(" > ");
}

/**
 * Formatta il valore per la visualizzazione
 */
function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default RedFlagsAlert;
