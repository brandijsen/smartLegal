import { FiDollarSign } from "react-icons/fi";

const PrimaryAmountCard = ({ amounts, documentSubtype }) => {
  if (!amounts) return null;

  // Determine primary amount based on document type
  let primaryAmount = null;
  let primaryLabel = "";

  if (documentSubtype === "professional_fee" && amounts.net_payable) {
    // Professional fee: show Net Payable (after withholding)
    primaryAmount = amounts.net_payable;
    primaryLabel = "Net Payable";
  } else if (amounts.total_amount) {
    // All invoice types: show Total Amount
    primaryAmount = amounts.total_amount;
    
    // Customize label based on subtype
    if (documentSubtype === "reverse_charge") {
      primaryLabel = "Total Amount (VAT 0%)";
    } else if (documentSubtype === "tax_exempt") {
      primaryLabel = "Total Amount (Tax Exempt)";
    } else {
      primaryLabel = "Total Amount";
    }
  } else if (amounts.subtotal) {
    // Fallback: subtotal
    primaryAmount = amounts.subtotal;
    primaryLabel = "Subtotal";
  } else if (amounts.gross_fee) {
    // Fallback: gross fee
    primaryAmount = amounts.gross_fee;
    primaryLabel = "Gross Amount";
  }

  if (!primaryAmount) return null;

  return (
    <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl p-8 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider opacity-90 mb-2">
            {primaryLabel}
          </p>
          <p className="text-4xl font-bold">
            {amounts.currency || "€"} {primaryAmount}
          </p>
        </div>

        <div className="bg-white/20 p-4 rounded-full">
          <FiDollarSign size={32} />
        </div>
      </div>
    </div>
  );
};

export default PrimaryAmountCard;
