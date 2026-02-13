import xlsx from "xlsx";

/**
 * Converte i documenti in formato CSV
 */
export const generateCSV = (documents) => {
  // Header CSV
  const headers = [
    "ID",
    "File Name",
    "Status",
    "Uploaded At",
    "Processed At",
    "Document Type",
    "Document Subtype",
    "Currency",
    "Total Amount",
    "Subtotal",
    "VAT Amount",
    "VAT Rate"
  ];

  // Righe dati
  const rows = documents.map((doc) => {
    const semantic = doc.parsed_json?.semantic || {};
    const amounts = semantic.amounts || {};

    return [
      doc.id,
      doc.original_name,
      doc.status,
      new Date(doc.uploaded_at).toLocaleString("en-GB"),
      doc.processed_at ? new Date(doc.processed_at).toLocaleString("en-GB") : "",
      doc.parsed_json?.document_type || "",
      doc.parsed_json?.document_subtype || "",
      amounts.currency || "",
      amounts.total_amount || amounts.net_payable || "",
      amounts.subtotal || amounts.gross_fee || "",
      amounts.vat?.amount || "",
      amounts.vat?.rate || ""
    ];
  });

  // Costruisci CSV manualmente
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  return csvContent;
};

/**
 * Converte i documenti in formato Excel
 */
export const generateExcel = (documents) => {
  // Prepara i dati
  const data = documents.map((doc) => {
    const semantic = doc.parsed_json?.semantic || {};
    const amounts = semantic.amounts || {};

    return {
      ID: doc.id,
      "File Name": doc.original_name,
      Status: doc.status,
      "Uploaded At": new Date(doc.uploaded_at).toLocaleString("en-GB"),
      "Processed At": doc.processed_at
        ? new Date(doc.processed_at).toLocaleString("en-GB")
        : "",
      "Document Type": doc.parsed_json?.document_type || "",
      "Document Subtype": doc.parsed_json?.document_subtype || "",
      Currency: amounts.currency || "",
      "Total Amount": amounts.total_amount || amounts.net_payable || "",
      Subtotal: amounts.subtotal || amounts.gross_fee || "",
      "VAT Amount": amounts.vat?.amount || "",
      "VAT Rate": amounts.vat?.rate ? `${amounts.vat.rate}%` : ""
    };
  });

  // Crea workbook
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);

  // Auto-size colonne
  const maxWidth = 50;
  const wscols = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.min(maxWidth, Math.max(key.length + 2, 10))
  }));
  ws["!cols"] = wscols;

  xlsx.utils.book_append_sheet(wb, ws, "Documents");

  // Genera buffer
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
};
