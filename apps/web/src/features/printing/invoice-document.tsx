export type InvoiceData = {
  company: {
    name: string;
    legalName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    currencyCode: string;
    timezone: string;
  };
  branch: { name: string; phone: string | null; address: string | null };
  invoice: {
    invoiceNumber: string;
    completedAt: string;
    pricingMode: string;
    status: string;
    notes: string | null;
  };
  register: { name: string; code: string };
  customer: { code: string; name: string; phone: string | null; address: string | null };
  cashier: { name: string; email: string };
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    tileSize: string | null;
    batchNumber: string | null;
    shade: string | null;
    quantity: string;
    unit: string;
    baseQuantity: string;
    unitPrice: string;
    discount: string;
    tax: string;
    lineTotal: string;
  }>;
  totals: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paid: string;
    returnCredits: string;
    refunded: string;
    outstanding: string;
    change: string;
  };
  payments: Array<{ number: string; method: string; amount: string; reference: string | null }>;
  returns: Array<{ number: string; kind: string; amount: string }>;
};

const totalRows: ReadonlyArray<[keyof InvoiceData['totals'], string]> = [
  ['subtotal', 'Subtotal'],
  ['discount', 'Discount'],
  ['tax', 'Tax'],
  ['total', 'Total'],
  ['paid', 'Paid'],
  ['returnCredits', 'Return credits'],
  ['refunded', 'Refunded'],
  ['outstanding', 'Due'],
  ['change', 'Change'],
];

export function formatDecimalForPrint(value: string, minimumFractionDigits = 0): string {
  const match = value.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return value;
  const [, sign, integerPart, rawFraction = ''] = match;
  const groupedInteger = integerPart.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = rawFraction.replace(/0+$/, '').padEnd(minimumFractionDigits, '0');
  return `${sign}${groupedInteger}${fraction ? `.${fraction}` : ''}`;
}

export function InvoiceDocument({ data, mode }: { data: InvoiceData; mode: 'thermal' | 'a4' }) {
  const currency = data.company.currencyCode;
  const completedAt = new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: data.company.timezone,
  }).format(new Date(data.invoice.completedAt));

  return (
    <article
      aria-label={`${mode === 'thermal' ? 'Thermal receipt' : 'A4 invoice'} ${data.invoice.invoiceNumber}`}
      data-testid="print-document"
      className={`print-document ${mode === 'thermal' ? 'print-thermal' : 'print-a4'} bg-white text-slate-950`}
    >
      <header className="invoice-header text-center">
        <p className="invoice-document-kind">
          {mode === 'thermal' ? 'Sales receipt' : 'Tax invoice'}
        </p>
        <h1>{data.company.legalName ?? data.company.name}</h1>
        <p className="font-semibold">{data.branch.name}</p>
        {(data.branch.address ?? data.company.address) ? (
          <p>{data.branch.address ?? data.company.address}</p>
        ) : null}
        {(data.branch.phone ?? data.company.phone) ? (
          <p>Phone: {data.branch.phone ?? data.company.phone}</p>
        ) : null}
        {mode === 'a4' && data.company.email ? <p>{data.company.email}</p> : null}
      </header>

      <section className="invoice-meta" aria-label="Invoice information">
        <div>
          <span>Invoice</span>
          <strong>{data.invoice.invoiceNumber}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>{completedAt}</strong>
        </div>
        <div>
          <span>Cashier</span>
          <strong>{data.cashier.name}</strong>
        </div>
        <div>
          <span>Register</span>
          <strong>{data.register.code}</strong>
        </div>
      </section>

      <section className="invoice-party" aria-label="Customer information">
        <span>Customer</span>
        <strong>{data.customer.name}</strong>
        <small>
          {data.customer.code}
          {data.customer.phone ? ` · ${data.customer.phone}` : ''}
        </small>
        {mode === 'a4' && data.customer.address ? <small>{data.customer.address}</small> : null}
      </section>

      <table className="invoice-lines">
        <caption className="sr-only">Invoice items</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Qty</th>
            <th scope="col" className="invoice-a4-only numeric-cell">
              Discount
            </th>
            <th scope="col" className="invoice-a4-only numeric-cell">
              Tax
            </th>
            <th scope="col" className="numeric-cell">
              Price
            </th>
            <th scope="col" className="numeric-cell">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.productName}</strong>
                <small>
                  {item.sku}
                  {item.tileSize ? ` · ${item.tileSize}` : ''}
                </small>
                {item.batchNumber || item.shade ? (
                  <small>
                    {item.batchNumber ? `Batch ${item.batchNumber}` : ''}
                    {item.batchNumber && item.shade ? ' / ' : ''}
                    {item.shade ? `Shade ${item.shade}` : ''}
                  </small>
                ) : null}
              </td>
              <td className="tabular-nums">
                {formatDecimalForPrint(item.quantity)} {item.unit}
              </td>
              <td className="invoice-a4-only numeric-cell tabular-nums">
                {formatDecimalForPrint(item.discount, 2)}
              </td>
              <td className="invoice-a4-only numeric-cell tabular-nums">
                {formatDecimalForPrint(item.tax, 2)}
              </td>
              <td className="numeric-cell tabular-nums">
                {formatDecimalForPrint(item.unitPrice, 2)}
              </td>
              <td className="numeric-cell tabular-nums">
                {formatDecimalForPrint(item.lineTotal, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-totals" aria-label="Invoice totals">
        {totalRows.map(([key, label]) => (
          <div key={key} className={key === 'total' ? 'invoice-grand-total' : undefined}>
            <span>{label}</span>
            <strong className="tabular-nums">
              {formatDecimalForPrint(data.totals[key], 2)} {currency}
            </strong>
          </div>
        ))}
      </section>

      <section className="invoice-payments" aria-label="Payment summary">
        <h2>Payments</h2>
        {data.payments.length ? (
          data.payments.map((payment) => (
            <div key={payment.number}>
              <span>
                {payment.method}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </span>
              <strong className="tabular-nums">
                {formatDecimalForPrint(payment.amount, 2)} {currency}
              </strong>
            </div>
          ))
        ) : (
          <p>No payments recorded.</p>
        )}
        {data.returns.map((row) => (
          <div key={row.number}>
            <span>
              {row.kind.replaceAll('_', ' ')} · {row.number}
            </span>
            <strong className="tabular-nums">
              −{formatDecimalForPrint(row.amount, 2)} {currency}
            </strong>
          </div>
        ))}
      </section>

      {data.invoice.notes ? (
        <section className="invoice-notes" aria-label="Invoice notes">
          <strong>Notes</strong>
          <p>{data.invoice.notes}</p>
        </section>
      ) : null}

      <footer>
        <p>Thank you for your business.</p>
        <p className="invoice-a4-only">Generated from the immutable historical sale record.</p>
      </footer>
    </article>
  );
}
