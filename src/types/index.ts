// Shared types for the application

export type UserRole = "admin" | "manager" | "biller" | "cashier";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: Date;
  isActive: boolean;
}

// Page keys that can be assigned by admin
export type PageKey = 
  | "dashboard"
  | "inventory" 
  | "add_product"
  | "price_check"
  | "clients"
  | "invoices"
  | "payments"
  | "cheques"
  | "recovery"
  | "city_recovery"
  | "returns"
  | "reports"
  | "audit_logs"
  | "settings"
  | "users"
  | "bulk_clients";

export interface PagePermission {
  pageKey: PageKey;
  hasAccess: boolean;
}

// Default page access per role
export const ROLE_DEFAULT_PAGES: Record<UserRole, PageKey[]> = {
  admin: ["dashboard", "inventory", "add_product", "price_check", "clients", "invoices", "payments", "cheques", "recovery", "city_recovery", "returns", "reports", "users", "audit_logs", "settings", "bulk_clients"],
  manager: ["dashboard", "inventory", "add_product", "price_check", "clients", "invoices", "payments", "cheques", "recovery", "city_recovery", "returns", "reports", "audit_logs", "settings", "bulk_clients"],
  biller: ["dashboard", "inventory", "add_product", "price_check", "clients", "invoices", "returns"],
  cashier: ["dashboard", "payments", "cheques", "recovery", "city_recovery"],
};

// Page metadata for UI display
export const PAGE_METADATA: Record<PageKey, { label: string; description: string }> = {
  dashboard: { label: "Dashboard", description: "Overview & analytics" },
  inventory: { label: "Inventory", description: "Products & stock management" },
  add_product: { label: "Add Product", description: "Add new products to inventory" },
  price_check: { label: "Price Check", description: "Quick price lookup" },
  clients: { label: "Clients", description: "Customer management" },
  invoices: { label: "Invoices", description: "Create & manage invoices" },
  payments: { label: "Payments", description: "Record payments" },
  cheques: { label: "Cheques", description: "Track given cheques" },
  recovery: { label: "Recovery", description: "Debt recovery management" },
  city_recovery: { label: "City Recovery", description: "City-wise recovery entry & print" },
  returns: { label: "Returns", description: "Process returns" },
  reports: { label: "Reports", description: "Sales & financial reports" },
  audit_logs: { label: "Audit Logs", description: "Activity history" },
  settings: { label: "Settings", description: "App configuration" },
  users: { label: "Users", description: "User management (Admin only)" },
  bulk_clients: { label: "Bulk Clients", description: "Import clients in bulk" },
};

// Legacy permission interface (kept for backward compat in some components)
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
  manager: {
    canManageUsers: false,
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
  pairsPerBundle: number;
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
  totalPairs: number;
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
  | "login" | "logout" | "create" | "update" | "delete" | "view"
  | "save_draft" | "export" | "import" | "print";

export type AuditEntity = 
  | "user" | "product" | "brand" | "client" | "invoice" 
  | "recovery" | "payment" | "settings" | "report" | "cheque";

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

export const DEFAULT_SIZE_BUNDLES = ["7-10", "4-6", "1-3"];
