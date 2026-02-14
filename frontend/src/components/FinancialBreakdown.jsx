import { FiTrendingUp, FiTrendingDown, FiDollarSign } from "react-icons/fi";
import { normalizeAmounts, extractValue } from "../utils/dataHelpers";

const AmountRow = ({ label, value, type = "neutral", icon: Icon }) => {
  const getStyles = () => {
    switch (type) {
      case "positive":
        return "text-emerald-600 font-medium";
      case "negative":
        return "text-red-600 font-medium";
      case "total":
        return "text-slate-900 font-bold text-lg border-t-2 pt-3 mt-2";
      default:
        return "text-slate-700";
    }
  };

  return (
    <div className={`flex items-center justify-between py-2.5 ${type === "total" ? "" : "border-b border-slate-100 last:border-b-0"}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-400" />}
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className={getStyles()}>{value}</span>
    </div>
  );
};

const FinancialBreakdown = ({ amounts, documentSubtype }) => {
  if (!amounts) return null;

  // Normalizza amounts per gestire { value, confidence }
  const normalized = normalizeAmounts(amounts);
  const currency = extractValue(amounts.currency) || "€";

  const formatAmount = (value) => {
    if (!value) return null;
    return `${currency} ${value}`;
  };

  // Professional fee calculation
  if (documentSubtype === "professional_fee") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FiDollarSign className="text-emerald-600" />
          Financial Breakdown
        </h3>

        <div className="space-y-1">
          {normalized.gross_fee && (
            <AmountRow
              label="Gross Fee"
              value={formatAmount(normalized.gross_fee)}
              type="neutral"
            />
          )}

          {normalized.vat?.amount && (
            <AmountRow
              label={`+ Tax (VAT ${normalized.vat.rate}%)`}
              value={formatAmount(normalized.vat.amount)}
              type="positive"
              icon={FiTrendingUp}
            />
          )}

          {normalized.withholding_tax?.amount && (
            <AmountRow
              label={`- Withholding Tax (${normalized.withholding_tax.rate}%)`}
              value={`- ${formatAmount(normalized.withholding_tax.amount)}`}
              type="negative"
              icon={FiTrendingDown}
            />
          )}

          {normalized.stamp_duty?.present && normalized.stamp_duty?.amount && (
            <AmountRow
              label="+ Stamp Duty"
              value={formatAmount(normalized.stamp_duty.amount)}
              type="positive"
            />
          )}

          {normalized.net_payable && (
            <AmountRow
              label="Net Payable"
              value={formatAmount(normalized.net_payable)}
              type="total"
            />
          )}
        </div>
      </div>
    );
  }

  // Reverse charge (cross-border, no VAT)
  if (documentSubtype === "reverse_charge") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FiDollarSign className="text-emerald-600" />
          Financial Breakdown
        </h3>

        <div className="space-y-1">
          {normalized.subtotal && (
            <AmountRow
              label="Subtotal"
              value={formatAmount(normalized.subtotal)}
              type="neutral"
            />
          )}

          <div className="py-2 text-xs text-slate-500 italic border-b border-slate-100">
            VAT 0% – Reverse charge applies (customer liable for VAT)
          </div>

          {normalized.total_amount && (
            <AmountRow
              label="Total Amount"
              value={formatAmount(normalized.total_amount)}
              type="total"
            />
          )}
        </div>
      </div>
    );
  }

  // Tax exempt (no VAT)
  if (documentSubtype === "tax_exempt") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FiDollarSign className="text-emerald-600" />
          Financial Breakdown
        </h3>

        <div className="space-y-1">
          {normalized.subtotal && (
            <AmountRow
              label="Subtotal"
              value={formatAmount(normalized.subtotal)}
              type="neutral"
            />
          )}

          <div className="py-2 text-xs text-slate-500 italic border-b border-slate-100">
            VAT exempt service or flat-rate regime
          </div>

          {normalized.total_amount && (
            <AmountRow
              label="Total Amount"
              value={formatAmount(normalized.total_amount)}
              type="total"
            />
          )}
        </div>
      </div>
    );
  }

  // Standard invoice (default)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <FiDollarSign className="text-emerald-600" />
        Financial Breakdown
      </h3>

      <div className="space-y-1">
        {normalized.subtotal && (
          <AmountRow
            label="Subtotal (Net Amount)"
            value={formatAmount(normalized.subtotal)}
            type="neutral"
          />
        )}

        {normalized.vat?.amount && (
          <AmountRow
            label={`+ Tax (VAT ${normalized.vat.rate}%)`}
            value={formatAmount(normalized.vat.amount)}
            type="positive"
            icon={FiTrendingUp}
          />
        )}

        {normalized.stamp_duty?.present && normalized.stamp_duty?.amount && (
          <AmountRow
            label="+ Stamp Duty"
            value={formatAmount(normalized.stamp_duty.amount)}
            type="positive"
          />
        )}

        {normalized.total_amount && (
          <AmountRow
            label="Total Amount"
            value={formatAmount(normalized.total_amount)}
            type="total"
          />
        )}
      </div>
    </div>
  );
};

export default FinancialBreakdown;
