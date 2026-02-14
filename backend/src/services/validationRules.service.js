/**
 * ============================================================================
 * VALIDATION RULES SERVICE
 * ============================================================================
 * Controlla la consistenza matematica e logica dei dati estratti dall'AI
 * per intercettare errori "silent" che l'AI non rileva autonomamente.
 * 
 * CRITICAL: Questo modulo aggiunge un layer di sicurezza per la produzione
 * ============================================================================
 */

const TOLERANCE = 0.01; // Tolleranza per confronti decimali (±1 centesimo)

/**
 * Valida i dati estratti e restituisce un oggetto con i flag di validazione
 * @param {Object} semantic - Dati estratti dall'AI (semantic.amounts)
 * @param {String} document_subtype - Tipo di documento (professional_fee, standard, etc)
 * @returns {Object} - { isValid: boolean, flags: [...], validatedData: {...} }
 */
export function validateExtractedData(semantic, document_subtype) {
  if (!semantic || !semantic.amounts) {
    return {
      isValid: true,
      flags: [],
      validatedData: semantic,
    };
  }

  const amounts = semantic.amounts;
  const flags = [];

  // ============================================================================
  // VALIDATION RULES PER DOCUMENT SUBTYPE
  // ============================================================================

  if (document_subtype === "professional_fee") {
    validateProfessionalFee(amounts, flags);
  } else if (document_subtype === "standard") {
    validateStandardInvoice(amounts, flags);
  } else if (document_subtype === "reverse_charge") {
    validateReverseCharge(amounts, flags);
  } else if (document_subtype === "tax_exempt") {
    validateTaxExempt(amounts, flags);
  }

  // ============================================================================
  // VALIDATION RULES COMUNI A TUTTI I DOCUMENTI
  // ============================================================================

  validateCommonRules(amounts, flags);

  // ============================================================================
  // RISULTATO
  // ============================================================================

  const isValid = flags.filter((f) => f.severity === "critical").length === 0;

  return {
    isValid,
    flags,
    validatedData: {
      ...semantic,
      validation: {
        validated_at: new Date().toISOString(),
        is_valid: isValid,
        flags_count: flags.length,
      },
    },
  };
}

/**
 * ============================================================================
 * VALIDATION: PROFESSIONAL FEE (Fattura Professionista)
 * ============================================================================
 * Formula: Gross + VAT - Withholding + Stamp = Net Payable
 */
function validateProfessionalFee(amounts, flags) {
  const grossFee = getNumericValue(amounts.gross_fee);
  const vatAmount = getNumericValue(amounts.vat?.amount);
  const vatRate = getNumericValue(amounts.vat?.rate);
  const withholdingAmount = getNumericValue(amounts.withholding_tax?.amount);
  const withholdingRate = getNumericValue(amounts.withholding_tax?.rate);
  const stampDuty = getNumericValue(amounts.stamp_duty?.amount);
  const netPayable = getNumericValue(amounts.net_payable);

  // 🔴 CRITICAL: Net payable > Gross * 2 (errore palese)
  if (grossFee && netPayable && netPayable > grossFee * 2) {
    flags.push({
      field: "net_payable",
      severity: "critical",
      message: `Net payable (€${netPayable.toFixed(2)}) seems too high (>200% of gross fee €${grossFee.toFixed(2)})`,
      type: "logic_error",
    });
  }

  // 🟠 HIGH: Withholding > Gross (impossibile)
  if (grossFee && withholdingAmount && withholdingAmount > grossFee) {
    flags.push({
      field: "withholding_tax.amount",
      severity: "critical",
      message: `Withholding tax (€${withholdingAmount.toFixed(2)}) cannot exceed gross fee (€${grossFee.toFixed(2)})`,
      type: "logic_error",
    });
  }

  // 🟡 MEDIUM: VAT calculation mismatch
  if (grossFee && vatRate && vatAmount) {
    const expectedVat = grossFee * (vatRate / 100);
    const difference = Math.abs(vatAmount - expectedVat);

    if (difference > TOLERANCE) {
      flags.push({
        field: "vat.amount",
        severity: "high",
        message: `VAT calculation mismatch: expected €${expectedVat.toFixed(2)} (${vatRate}% of €${grossFee.toFixed(2)}), but got €${vatAmount.toFixed(2)}`,
        type: "calculation_error",
        expected: expectedVat.toFixed(2),
        actual: vatAmount.toFixed(2),
      });
    }
  }

  // 🟡 MEDIUM: Withholding calculation mismatch
  if (grossFee && withholdingRate && withholdingAmount) {
    const expectedWithholding = grossFee * (withholdingRate / 100);
    const difference = Math.abs(withholdingAmount - expectedWithholding);

    if (difference > TOLERANCE) {
      flags.push({
        field: "withholding_tax.amount",
        severity: "medium",
        message: `Withholding tax calculation mismatch: expected €${expectedWithholding.toFixed(2)} (${withholdingRate}% of €${grossFee.toFixed(2)}), but got €${withholdingAmount.toFixed(2)}`,
        type: "calculation_error",
        expected: expectedWithholding.toFixed(2),
        actual: withholdingAmount.toFixed(2),
      });
    }
  }

  // 🟡 MEDIUM: Net payable calculation mismatch
  if (grossFee && netPayable) {
    const expectedNet =
      grossFee +
      (vatAmount || 0) -
      (withholdingAmount || 0) +
      (stampDuty || 0);
    const difference = Math.abs(netPayable - expectedNet);

    if (difference > TOLERANCE) {
      flags.push({
        field: "net_payable",
        severity: "high",
        message: `Net payable calculation mismatch: expected €${expectedNet.toFixed(2)}, but got €${netPayable.toFixed(2)}`,
        type: "calculation_error",
        expected: expectedNet.toFixed(2),
        actual: netPayable.toFixed(2),
        formula:
          "Gross (€" +
          grossFee.toFixed(2) +
          ") + VAT (€" +
          (vatAmount || 0).toFixed(2) +
          ") - Withholding (€" +
          (withholdingAmount || 0).toFixed(2) +
          ") + Stamp (€" +
          (stampDuty || 0).toFixed(2) +
          ")",
      });
    }
  }

  // 🔵 INFO: Negative net payable (possibile ma raro)
  if (netPayable < 0) {
    flags.push({
      field: "net_payable",
      severity: "low",
      message: `Net payable is negative (€${netPayable.toFixed(2)}). This is unusual but possible if withholding exceeds gross+VAT.`,
      type: "unusual_value",
    });
  }
}

/**
 * ============================================================================
 * VALIDATION: STANDARD INVOICE (Fattura Standard B2B con IVA)
 * ============================================================================
 * Formula: Subtotal + VAT = Total
 */
function validateStandardInvoice(amounts, flags) {
  const subtotal = getNumericValue(amounts.subtotal);
  const vatAmount = getNumericValue(amounts.vat?.amount);
  const vatRate = getNumericValue(amounts.vat?.rate);
  const total = getNumericValue(amounts.total_amount);

  // 🔴 CRITICAL: Total > Subtotal * 2 (errore palese)
  if (subtotal && total && total > subtotal * 2) {
    flags.push({
      field: "total_amount",
      severity: "critical",
      message: `Total (€${total.toFixed(2)}) seems too high (>200% of subtotal €${subtotal.toFixed(2)})`,
      type: "logic_error",
    });
  }

  // 🟡 MEDIUM: VAT calculation mismatch
  if (subtotal && vatRate && vatAmount) {
    const expectedVat = subtotal * (vatRate / 100);
    const difference = Math.abs(vatAmount - expectedVat);

    if (difference > TOLERANCE) {
      flags.push({
        field: "vat.amount",
        severity: "high",
        message: `VAT calculation mismatch: expected €${expectedVat.toFixed(2)} (${vatRate}% of €${subtotal.toFixed(2)}), but got €${vatAmount.toFixed(2)}`,
        type: "calculation_error",
        expected: expectedVat.toFixed(2),
        actual: vatAmount.toFixed(2),
      });
    }
  }

  // 🟡 MEDIUM: Total calculation mismatch
  if (subtotal && total && vatAmount) {
    const expectedTotal = subtotal + vatAmount;
    const difference = Math.abs(total - expectedTotal);

    if (difference > TOLERANCE) {
      flags.push({
        field: "total_amount",
        severity: "high",
        message: `Total calculation mismatch: expected €${expectedTotal.toFixed(2)} (subtotal + VAT), but got €${total.toFixed(2)}`,
        type: "calculation_error",
        expected: expectedTotal.toFixed(2),
        actual: total.toFixed(2),
        formula: `Subtotal (€${subtotal.toFixed(2)}) + VAT (€${vatAmount.toFixed(2)})`,
      });
    }
  }
}

/**
 * ============================================================================
 * VALIDATION: REVERSE CHARGE (Inversione Contabile)
 * ============================================================================
 * Formula: Subtotal = Total (no VAT applied by seller)
 */
function validateReverseCharge(amounts, flags) {
  const subtotal = getNumericValue(amounts.subtotal);
  const total = getNumericValue(amounts.total_amount);
  const vatAmount = getNumericValue(amounts.vat?.amount);

  // 🟡 MEDIUM: Total should equal subtotal
  if (subtotal && total) {
    const difference = Math.abs(total - subtotal);

    if (difference > TOLERANCE) {
      flags.push({
        field: "total_amount",
        severity: "medium",
        message: `Reverse charge invoice: total (€${total.toFixed(2)}) should equal subtotal (€${subtotal.toFixed(2)})`,
        type: "logic_error",
      });
    }
  }

  // 🔵 INFO: VAT present in reverse charge (unusual)
  if (vatAmount && vatAmount > 0) {
    flags.push({
      field: "vat.amount",
      severity: "low",
      message: `VAT amount detected (€${vatAmount.toFixed(2)}) in reverse charge invoice. Verify if this is correct.`,
      type: "unusual_value",
    });
  }
}

/**
 * ============================================================================
 * VALIDATION: TAX EXEMPT (Regime Forfettario / Esenzione IVA)
 * ============================================================================
 * Formula: Subtotal = Total (no VAT/tax)
 */
function validateTaxExempt(amounts, flags) {
  const subtotal = getNumericValue(amounts.subtotal);
  const total = getNumericValue(amounts.total_amount);
  const vatAmount = getNumericValue(amounts.vat?.amount);

  // 🟡 MEDIUM: Total should equal subtotal
  if (subtotal && total) {
    const difference = Math.abs(total - subtotal);

    if (difference > TOLERANCE) {
      flags.push({
        field: "total_amount",
        severity: "medium",
        message: `Tax-exempt invoice: total (€${total.toFixed(2)}) should equal subtotal (€${subtotal.toFixed(2)})`,
        type: "logic_error",
      });
    }
  }

  // 🔵 INFO: VAT present in tax-exempt (unusual)
  if (vatAmount && vatAmount > 0) {
    flags.push({
      field: "vat.amount",
      severity: "low",
      message: `VAT amount detected (€${vatAmount.toFixed(2)}) in tax-exempt invoice. Verify if this is correct.`,
      type: "unusual_value",
    });
  }
}

/**
 * ============================================================================
 * VALIDATION: COMMON RULES (applicabili a tutti i tipi)
 * ============================================================================
 */
function validateCommonRules(amounts, flags) {
  // 🔴 CRITICAL: Negative amounts (salvo casi specifici già gestiti)
  for (const [key, value] of Object.entries(amounts)) {
    if (key === "currency") continue;

    const numValue = getNumericValue(value);

    if (numValue !== null && numValue < 0 && key !== "net_payable") {
      flags.push({
        field: key,
        severity: "critical",
        message: `${formatFieldName(key)} is negative (€${numValue.toFixed(2)}). This is likely an error.`,
        type: "logic_error",
      });
    }
  }

  // 🟡 MEDIUM: VAT rate non standard (es: 25%, 15%)
  const vatRate = getNumericValue(amounts.vat?.rate);
  const standardRates = [0, 4, 5, 10, 22]; // Aliquote IVA italiane comuni

  if (vatRate !== null && !standardRates.includes(vatRate)) {
    flags.push({
      field: "vat.rate",
      severity: "low",
      message: `VAT rate ${vatRate}% is non-standard. Verify if this is correct (standard rates: 4%, 10%, 22%).`,
      type: "unusual_value",
    });
  }

  // 🔴 CRITICAL: Currency mismatch detection
  const currency = amounts.currency?.value || amounts.currency;
  
  if (!currency || (currency && typeof currency === 'object' && !currency.value)) {
    flags.push({
      field: "currency",
      severity: "medium",
      message: "Currency not detected in document. Verify manually.",
      type: "missing_value",
    });
  }

  // 🟡 MEDIUM: Extremely large amounts (possible OCR error like 100x multiplier)
  for (const [key, value] of Object.entries(amounts)) {
    if (key === "currency") continue;

    const numValue = getNumericValue(value);

    if (numValue !== null && numValue > 1000000) {
      // >1M€
      flags.push({
        field: key,
        severity: "medium",
        message: `${formatFieldName(key)} is very large (€${numValue.toFixed(2)}). Verify if this is correct.`,
        type: "unusual_value",
      });
    }
  }
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Estrae il valore numerico da un campo (gestisce sia { value, confidence } che valori diretti)
 */
function getNumericValue(field) {
  if (!field) return null;

  // Se ha struttura { value, confidence }
  if (typeof field === "object" && "value" in field) {
    const val = field.value;
    if (typeof val === "string") {
      return parseFloat(val.replace(/,/g, ""));
    }
    return typeof val === "number" ? val : null;
  }

  // Se è un numero diretto
  if (typeof field === "number") return field;

  // Se è una stringa
  if (typeof field === "string") {
    return parseFloat(field.replace(/,/g, ""));
  }

  return null;
}

/**
 * Formatta il nome del campo per i messaggi
 */
function formatFieldName(fieldKey) {
  return fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * ============================================================================
 * EXPORT VALIDATION FLAGS PER IL FRONTEND
 * ============================================================================
 * Converte i flag di validazione in un formato compatibile con RedFlagsAlert
 */
export function convertValidationFlagsToRedFlags(validationFlags) {
  return validationFlags.map((flag) => ({
    path: flag.field,
    label: formatFieldName(flag.field),
    confidence: getSeverityScore(flag.severity),
    severity: flag.severity,
    message: flag.message,
    type: flag.type,
    expected: flag.expected,
    actual: flag.actual,
  }));
}

/**
 * Converte severity in confidence score (per compatibilità con UI esistente)
 */
function getSeverityScore(severity) {
  const severityMap = {
    critical: 20, // 🔴 Grave
    high: 40, // 🟠 Alto
    medium: 55, // 🟡 Medio
    low: 65, // 🔵 Basso (ma sotto threshold 70)
  };

  return severityMap[severity] || 50;
}
