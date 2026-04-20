import type { PaperSize } from "./printUtils";

export type PrintDocType =
  | "invoice"
  | "paymentReceipt"
  | "recoveryList"
  | "clientHistory"
  | "cheques"
  | "returns";

const STORAGE_KEY = "shamshad.printPreferences.v1";

const DEFAULTS: Record<PrintDocType, PaperSize> = {
  invoice: "slip80",
  paymentReceipt: "slip80",
  recoveryList: "A4",
  clientHistory: "A4",
  cheques: "A4",
  returns: "A4",
};

export const PRINT_DOC_LABELS: Record<PrintDocType, string> = {
  invoice: "Invoices / Bills",
  paymentReceipt: "Payment Receipts",
  recoveryList: "Recovery Lists",
  clientHistory: "Client History",
  cheques: "Cheques",
  returns: "Returns",
};

function readAll(): Record<PrintDocType, PaperSize> {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<PrintDocType, PaperSize>>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeAll(prefs: Record<PrintDocType, PaperSize>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

export function getPrintDefault(docType: PrintDocType): PaperSize {
  return readAll()[docType];
}

export function getAllPrintDefaults(): Record<PrintDocType, PaperSize> {
  return readAll();
}

export function setPrintDefault(docType: PrintDocType, size: PaperSize) {
  const prefs = readAll();
  prefs[docType] = size;
  writeAll(prefs);
}

export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  A4: "A4 (full page)",
  slip80: "Slip 80mm (thermal)",
};