// Shared types for the application

export interface Brand {
  id: string;
  name: string;
}

export interface SizeBundlePricing {
  sizeRange: string; // Now can be custom like "7-10", "4-6", "1-3" or any custom range
  pricePerPair: number;
}

export interface Product {
  id: string;
  name: string;
  articleNumber: string; // SKU
  brandId: string;
  brandName: string;
  category: string;
  stockDozens: number; // Stock in dozens
  pairsPerDozen: number; // Usually 12, but editable
  sizeBundles: SizeBundlePricing[];
  defaultPairsPerBundle: number; // usually 6
  supplier: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  openingBalance: number;
  currentBalance: number;
  totalSpent: number;
  invoiceCount: number;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  articleNumber: string;
  brandName: string;
  sizeRange: string;
  quantity: number; // number of bundles
  pairsPerBundle: number; // editable pairs in this bundle (can be less than default)
  pricePerPair: number;
  discountPerPair: number; // discount per pair in Rs
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "account";
  accountId?: string;
  amountReceived: number;
  balanceDue: number;
  status: "draft" | "sent" | "paid" | "partial" | "overdue";
  notes?: string;
  createdAt: Date;
}

export interface Recovery {
  id: string;
  clientId?: string;
  clientName?: string;
  city?: string;
  amount: number;
  date: Date;
  notes?: string;
  type: "client" | "city";
  // For city recoveries, track individual client amounts
  clientAmounts?: { clientId: string; clientName: string; amount: number }[];
}

export interface PaymentAccount {
  id: string;
  name: string;
}

// Default size bundles for dropdown
export const DEFAULT_SIZE_BUNDLES = ["7-10", "4-6", "1-3"];
