import { useState } from "react";
import { FiX, FiSave, FiAlertCircle } from "react-icons/fi";

/**
 * Modal per l'edit manuale dei dati estratti
 * Mostra TUTTI i campi editabili, con evidenza sui red flags
 */

const EditDataModal = ({ parsed, onClose, onSave, documentId }) => {
  const [editedData, setEditedData] = useState(parsed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Estrai campi DAGLI EDITED DATA, non dai props originali!
  const editableFields = extractEditableFields(editedData);
  const redFlagPaths = identifyRedFlags(parsed).map((f) => f.path);

  const handleFieldChange = (fieldPath, newValue) => {
    setEditedData((prev) => updateFieldInData(prev, fieldPath, newValue));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await onSave(editedData);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Edit Extracted Data
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {editableFields.map((field, idx) => {
            const isRedFlag = redFlagPaths.includes(field.path);

            return (
              <div
                key={idx}
                className={`rounded-lg border p-4 ${
                  isRedFlag
                    ? "bg-amber-50 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {isRedFlag && (
                    <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <label className="text-sm font-medium text-slate-900 flex-1">
                    {field.label}
                    {isRedFlag && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">
                        {field.confidence}% - Verify
                      </span>
                    )}
                  </label>
                </div>

                <input
                  type={getInputType(field.value)}
                  value={field.value ?? ""}
                  onChange={(e) => handleFieldChange(field.path, e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border text-sm font-mono ${
                    isRedFlag
                      ? "border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  } outline-none transition-all`}
                />
              </div>
            );
          })}

          {editableFields.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No editable fields found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Helper Functions =====

/**
 * Estrae tutti i campi editabili da parsed_json
 */
function extractEditableFields(obj, path = "") {
  const fields = [];

  function traverse(current, currentPath) {
    if (!current || typeof current !== "object") return;

    if ("value" in current && "confidence" in current) {
      fields.push({
        path: currentPath,
        value: current.value,
        confidence: current.confidence,
        label: formatFieldLabel(currentPath),
      });
      return;
    }

    for (const [key, value] of Object.entries(current)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      traverse(value, newPath);
    }
  }

  traverse(obj, path);
  return fields;
}

/**
 * Identifica i red flags
 */
function identifyRedFlags(parsedJson, threshold = 70) {
  if (!parsedJson) return [];

  const allFields = extractEditableFields(parsedJson);
  return allFields.filter((field) => field.confidence < threshold);
}

/**
 * Formatta il path in label leggibile
 */
function formatFieldLabel(path) {
  return path
    .split(".")
    .map((part) =>
      part.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .join(" > ");
}

/**
 * Determina il tipo di input in base al valore
 */
function getInputType(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "checkbox";
  return "text";
}

/**
 * Aggiorna un campo nel parsed_json
 */
function updateFieldInData(data, fieldPath, newValue) {
  const pathParts = fieldPath.split(".");
  const result = JSON.parse(JSON.stringify(data)); // Deep clone

  let current = result;

  for (let i = 0; i < pathParts.length - 1; i++) {
    if (!current[pathParts[i]]) {
      current[pathParts[i]] = {};
    }
    current = current[pathParts[i]];
  }

  const lastKey = pathParts[pathParts.length - 1];

  if (
    current[lastKey] &&
    typeof current[lastKey] === "object" &&
    "value" in current[lastKey]
  ) {
    current[lastKey].value = parseValue(newValue, current[lastKey].value);
    current[lastKey].confidence = 100; // Confidence 100 per campi editati
  } else {
    current[lastKey] = { value: newValue, confidence: 100 };
  }

  return result;
}

/**
 * Parse del valore in base al tipo originale
 */
function parseValue(newValue, originalValue) {
  if (typeof originalValue === "number") {
    const parsed = parseFloat(newValue);
    return isNaN(parsed) ? originalValue : parsed;
  }
  if (typeof originalValue === "boolean") {
    return Boolean(newValue);
  }
  return newValue;
}

export default EditDataModal;
