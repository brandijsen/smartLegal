import {
  FiFileText,
  FiDollarSign
} from "react-icons/fi";

const Card = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
    <div className="text-emerald-600 mt-1">
      <Icon size={22} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {value || "—"}
      </p>
    </div>
  </div>
);

const DocumentOverview = ({ semantic }) => {
  if (!semantic || !semantic.amounts) {
    return (
      <div className="bg-slate-100 border border-dashed rounded-xl p-6">
        Nessun dato strutturato disponibile.
      </div>
    );
  }

  const { amounts } = semantic;

  // 🔑 LOGICA DOMINIO
  // Se esiste gross_fee → è una parcella professionale
  const isProfessionalFee = !!amounts.gross_fee;

  // Total visualizzato in modo professionale
  const totalLabel = isProfessionalFee
    ? "Total (gross fee)"
    : "Total amount";

  const totalValue = isProfessionalFee
    ? amounts.gross_fee
      ? `${amounts.gross_fee} ${amounts.currency || "EUR"}`
      : null
    : amounts.total_amount
      ? `${amounts.total_amount} ${amounts.currency || "EUR"}`
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

      {/* TOTAL */}
      <Card
        icon={FiDollarSign}
        label={totalLabel}
        value={totalValue}
      />

      {/* NET PAYABLE */}
      {amounts.net_payable && (
        <Card
          icon={FiDollarSign}
          label="Net payable"
          value={`${amounts.net_payable} ${amounts.currency || "EUR"}`}
        />
      )}

      {/* WITHHOLDING TAX */}
      {amounts.withholding_tax?.amount && (
        <Card
          icon={FiFileText}
          label={`Withholding tax (${amounts.withholding_tax.rate}%)`}
          value={`− ${amounts.withholding_tax.amount} ${amounts.currency || "EUR"}`}
        />
      )}

      {/* STAMP DUTY */}
      {amounts.stamp_duty?.present && (
        <Card
          icon={FiFileText}
          label="Stamp duty"
          value={`${amounts.stamp_duty.amount} ${amounts.currency || "EUR"}`}
        />
      )}
    </div>
  );
};

export default DocumentOverview;
