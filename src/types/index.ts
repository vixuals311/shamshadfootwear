// Shared types for the application

export type UserRole = "admin" | "biller" | "cashier" | "biller_cashier";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  canManageClients: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canDeleteInvoices: boolean;
  canRecordPayments: boolean;
  canManageRecoveries: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canManageInventory: true,
    canManageClients: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canDeleteInvoices: true,
    canRecordPayments: true,
    canManageRecoveries: true,
  },
  biller: {
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canManageInventory: true,
    canManageClients: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canDeleteInvoices: false,
    canRecordPayments: false,
    canManageRecoveries: false,
  },
  cashier: {
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canManageInventory: false,
    canManageClients: false,
    canCreateInvoices: false,
    canEditInvoices: false,
    canDeleteInvoices: false,
    canRecordPayments: false,
    canManageRecoveries: true,
  },
  biller_cashier: {
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canManageInventory: true,
    canManageClients: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canDeleteInvoices: false,
    canRecordPayments: true,
    canManageRecoveries: true,
  },
};

export interface Brand {
  id: string;
  name: string;
}

export interface SizeBundlePricing {
  sizeRange: string;
  pricePerPair: number;
  pairsPerBundle: number; // Editable per bundle
}

export interface Product {
  id: string;
  name: string;
  articleNumber: string;
  brandId: string;
  brandName: string;
  category: string;
  stockDozens: number;
  pairsPerDozen: number;
  sizeBundles: SizeBundlePricing[];
  defaultPairsPerBundle: number;
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
  // For client portal login
  loginPin?: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  articleNumber: string;
  brandName: string;
  sizeRange: string;
  quantity: number;
  totalPairs: number; // Editable total pairs
  pricePerPair: number;
  discountPerPair: number;
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
  createdBy?: string;
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
  clientAmounts?: { clientId: string; clientName: string; amount: number }[];
  createdBy?: string;
}

export interface PaymentAccount {
  id: string;
  name: string;
}

export type AuditAction = 
  | "login" 
  | "logout" 
  | "create" 
  | "update" 
  | "delete" 
  | "view"
  | "save_draft"
  | "export"
  | "import"
  | "print";

export type AuditEntity = 
  | "user" 
  | "product" 
  | "brand" 
  | "client" 
  | "invoice" 
  | "recovery" 
  | "payment" 
  | "settings";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  entityName?: string;
  details?: string;
  timestamp: Date;
  ipAddress?: string;
}

// Default size bundles for dropdown
export const DEFAULT_SIZE_BUNDLES = ["7-10", "4-6", "1-3"];
