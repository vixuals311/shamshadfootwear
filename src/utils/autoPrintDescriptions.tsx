import { format } from "date-fns";

function ReceiptRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-1.5 text-muted-foreground align-top">{label}</td>
      <td
        className={`py-1.5 text-right align-top ${
          bold ? "font-semibold" : "font-medium"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

export function buildPaymentReceiptDescription(opts: {
  clientName: string;
  amount: number;
  previousBalance?: number;
  account?: string | null;
  date?: Date;
}): React.ReactNode {
  const {
    clientName,
    amount,
    previousBalance,
    account,
    date = new Date(),
  } = opts;

  const remainingBalance =
    typeof previousBalance === "number" ? previousBalance - amount : undefined;

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <tbody>
          <ReceiptRow label="Amount Received" value={`Rs ${amount.toLocaleString()}`} bold />
          {typeof previousBalance === "number" && (
            <ReceiptRow
              label="Previous Balance"
              value={`Rs ${previousBalance.toLocaleString()}`}
            />
          )}
          {typeof remainingBalance === "number" && (
            <ReceiptRow
              label="Remaining Balance"
              value={`Rs ${remainingBalance.toLocaleString()}`}
              bold
            />
          )}
          <ReceiptRow label="Client" value={clientName} />
          {account && <ReceiptRow label="Account" value={account} />}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {format(date, "dd MMM yyyy, hh:mm a")}
      </div>
    </div>
  );
}

export function buildInvoiceDescription(opts: {
  invoiceNumber: string;
  clientName: string;
  total: number;
  date?: Date;
}): React.ReactNode {
  const { invoiceNumber, clientName, total, date = new Date() } = opts;

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <tbody>
          <ReceiptRow label="Invoice #" value={invoiceNumber} />
          <ReceiptRow label="Total Amount" value={`Rs ${total.toLocaleString()}`} bold />
          <ReceiptRow label="Client" value={clientName} />
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {format(date, "dd MMM yyyy, hh:mm a")}
      </div>
    </div>
  );
}
