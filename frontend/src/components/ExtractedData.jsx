const Section = ({ title, items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-slate-700">{title}</h3>
      <ul className="list-disc pl-5 text-sm text-slate-600">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
};

const ExtractedData = ({ parsed }) => {
  if (!parsed) {
    return <div className="text-slate-600">No data available</div>;
  }

  return (
    <div className="space-y-6">
      <Section title="Amounts" items={parsed.amounts} />
      <Section title="Dates" items={parsed.dates} />
      <Section title="Emails" items={parsed.emails} />
      <Section title="Phones" items={parsed.phones} />
      <Section title="VAT Numbers" items={parsed.vat_numbers} />
      <Section title="Document Numbers" items={parsed.document_numbers} />
    </div>
  );
};

export default ExtractedData;
