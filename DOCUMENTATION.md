# Shamshad Footwear — Application Documentation

> **Comprehensive Use Case & Feature Reference**
> Version 1.1 | Last Updated: April 2026
> Contact: 0315-7162093 | 0305-5388093
> Address: Faisalabad Road, Chowk Azam, Layyah

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Dashboard](#4-dashboard)
5. [Inventory Management](#5-inventory-management)
6. [Client Management](#6-client-management)
7. [Invoice Management](#7-invoice-management)
8. [Payments](#8-payments)
9. [Recovery Management](#9-recovery-management)
10. [Returns & Credit Notes](#10-returns--credit-notes)
11. [Reports & Analytics](#11-reports--analytics)
12. [User Management](#12-user-management)
13. [Audit Logs](#13-audit-logs)
14. [Settings](#14-settings)
15. [Client Portal](#15-client-portal)
16. [Branding & Print Layout](#16-branding--print-layout)
17. [PWA & Mobile Support](#17-pwa--mobile-support)
18. [Data Export & Import](#18-data-export--import)
19. [Database Schema](#19-database-schema)
20. [Role-Based Access Control Matrix](#20-role-based-access-control-matrix)

---

## 1. Overview

Shamshad Footwear is a **wholesale footwear business management system** built as a Progressive Web Application (PWA). It manages the complete business lifecycle including inventory tracking, client management, invoicing, payments, debt recovery, returns, and reporting.

### Key Business Concepts
- **Products** are footwear items organized by brand, article number, gender category, and size bundles
- **Size Bundles** define pricing per size range (e.g., "7-10", "4-6", "1-3") with configurable pairs per bundle
- **Invoices** are created for clients with line items that reference product size bundles
- **Recovery** is the process of collecting outstanding debts from clients — either directly per client or grouped by city
- **Credit Notes** are generated from returns and can be applied against future invoices
- **Client Portal** allows clients to self-service view their invoices and account balance via phone number + PIN

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI Library | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS with custom design tokens |
| State Management | React Query (TanStack Query) |
| Routing | React Router DOM v6 |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Lovable Cloud (Supabase) |
| Authentication | Lovable Cloud Auth (email/password) |
| Database | PostgreSQL (via Lovable Cloud) |
| Edge Functions | Deno (for client portal login) |

---

## 3. Authentication & Authorization

### 3.1 Login (UC-AUTH-01)
- **Route:** `/login`
- **Actors:** All staff users
- **Flow:**
  1. User enters email and password
  2. System authenticates against Lovable Cloud Auth
  3. On success, user is redirected to the Dashboard (`/`)
  4. On failure, error toast is displayed
- **Special Cases:**
  - **First-time setup:** If no users exist in `user_roles`, a "Sign Up" option is displayed to create the first admin account
  - **Password visibility toggle:** Eye icon to show/hide password

### 3.2 Sign Up (UC-AUTH-02)
- **Route:** `/login` (toggle mode)
- **Actors:** First admin user only
- **Flow:**
  1. Only available when zero users exist in the system
  2. User enters name, email, and password
  3. Account is created with `admin` role by default
  4. A profile record is created in the `profiles` table

### 3.3 Forgot Password (UC-AUTH-03)
- **Route:** `/login` (toggle mode)
- **Flow:**
  1. User enters email address
  2. System sends a password reset link via email
  3. Link redirects to `/reset-password`

### 3.4 Reset Password (UC-AUTH-04)
- **Route:** `/reset-password`
- **Flow:**
  1. User arrives via email link with a recovery token
  2. Enters new password and confirms it
  3. Password is updated in the auth system

### 3.5 Role-Based Access Control
- Four roles: **Admin**, **Manager**, **Biller**, **Cashier**
- Each role has default page access (see [Section 20](#20-role-based-access-control-matrix))
- **Granular Page Overrides:** Admins can customize any user's page access beyond their role defaults via the User Management page
- Overrides are stored in `user_page_permissions` table and merged with role defaults via `get_user_page_access()` database function
- Protected routes redirect unauthenticated users to `/login`
- Sidebar navigation items are dynamically filtered based on the user's effective page access

---

## 4. Dashboard

### 4.1 Admin/Manager Dashboard (UC-DASH-01)
- **Route:** `/`
- **Actors:** Admin, Manager
- **Features:**
  - **Metric Cards (4):**
    - Total Revenue (with % change)
    - Active Invoices (count)
    - Products in Stock (total pairs)
    - Active Clients (count)
  - **Sales Chart:** Monthly sales trend (bar chart via Recharts)
  - **Low Stock Alert:** Products with critically low inventory
  - **Recent Invoices:** Latest 5 invoices with status badges
  - **Quick Stats Panel:**
    - Paid This Month
    - Pending Payments
    - Overdue Amount

### 4.2 Restricted Dashboard (UC-DASH-02)
- **Actors:** Biller, Cashier
- **Features:** Only shows:
  - Low Stock Alert
  - Recent Invoices
- Revenue metrics and charts are hidden

---

## 5. Inventory Management

### 5.1 View Products (UC-INV-01)
- **Route:** `/inventory`
- **Actors:** Admin, Manager, Biller
- **Features:**
  - Product list with article number, name, brand, category, gender, stock status
  - **Search:** By product name, article number, brand name, or category
  - **Filter by Gender:** Men, Women, Children, Unisex
  - **Filter by Category:** Dynamic categories from product data
  - **Stock Status Indicators:**
    - 🟢 In Stock (>60 pairs)
    - 🟡 Low (<60 pairs)
    - 🔴 Critical (≤24 pairs)
  - Size bundle details: size range, price/pair, pairs/bundle, quantity (bundles)

### 5.2 Add Product (UC-INV-02)
- **Route:** `/add-product`
- **Actors:** Admin, Manager, Biller
- **Dedicated Page:** Accessible from sidebar navigation and header quick actions
- **Flow:**
  1. Navigate to the standalone "Add Product" page
  2. Fill in: Name, Article Number, Brand (dropdown), Category, Gender, Pairs Per Dozen, Supplier
  3. Size bundles auto-load based on selected gender (from default size ranges)
  4. Set Price Per Pair, Pairs Per Bundle, and Quantity per size range
  5. Real-time stock calculation shows total pairs and dozens
  6. Confirmation dialog before saving
  7. Product and size bundles are inserted into the database
  8. Audit log entry is created

### 5.3 Edit Product (UC-INV-03)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click edit icon on a product row
  2. Pre-populated form with current product data
  3. Modify any fields including size bundles
  4. Save updates (existing size bundles are replaced)
  5. Audit log entry is created

### 5.4 Delete Product (UC-INV-04)
- **Actors:** Admin
- **Flow:**
  1. Click delete icon on a product row
  2. Confirmation dialog: "Are you sure?"
  3. Size bundles are deleted first, then the product
  4. Audit log entry is created

### 5.5 Restock Product (UC-INV-05)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click restock icon on a product row
  2. Dialog shows current quantity for each size bundle
  3. Enter additional quantity to add per size
  4. System updates quantity in `product_size_bundles` and recalculates `stock_dozens`

### 5.6 Brand Management (UC-INV-06)
- **Actors:** Admin, Manager, Biller
- **Features:**
  - View all brands in a separate tab
  - Add new brand (with confirmation dialog)
  - Delete brand (with confirmation dialog)

### 5.7 Size Range Management (UC-INV-07)
- **Actors:** Admin, Manager, Biller
- **Features:**
  - Default size ranges are defined per gender category (men, women, children, unisex)
  - Managed via Settings page or Inventory dialog
  - Each size range has: category, size range string, pairs per bundle, display order

### 5.8 Export Inventory (UC-INV-08)
- **Actors:** Admin, Manager, Biller
- **Format:** CSV download
- **Columns:** Article Number, Product Name, Brand, Category, Gender, Size Range, Price/Pair, Pairs/Bundle, Quantity, Stock Status

### 5.9 Import Inventory (UC-INV-09)
- **Actors:** Admin
- **Flow:**
  1. Click import button
  2. Select CSV file
  3. System parses and validates data
  4. Products are created/updated in bulk

---

## 6. Client Management

### 6.1 View Clients (UC-CLI-01)
- **Route:** `/clients`
- **Actors:** Admin, Manager, Biller
- **Features:**
  - **Grid View:** Client cards with name, phone, city, balance
  - **List View:** Table format with all client details
  - **Search:** By name, email, city, or phone number
  - **Client Card Info:** Name, email, phone, address, city, opening balance, current balance, total spent, invoice count

### 6.2 Add Client (UC-CLI-02)
- **Actors:** Admin, Manager, Biller
- **Required Fields:** Name, Phone (format: `0XXX-XXXXXXX`)
- **Optional Fields:** Email, Address, City (combobox with existing cities), Opening Balance, Reference Number, Notes
- **Validations:**
  - Phone number must match pattern `0XXX-XXXXXXX`
  - Duplicate phone number detection with warning
- **Flow:**
  1. Fill client form
  2. System checks for duplicate phone numbers
  3. Confirmation dialog
  4. Client is saved with `current_balance = opening_balance`
  5. Audit log entry created

### 6.3 Edit Client (UC-CLI-03)
- **Actors:** Admin, Manager, Biller
- **Flow:** Similar to Add Client but pre-populated with existing data

### 6.4 Delete Client (UC-CLI-04)
- **Actors:** Admin
- **Flow:** Confirmation dialog → delete from database → audit log

### 6.5 View Client Details (UC-CLI-05)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click on a client card/row
  2. Detail view shows:
     - **Account Summary:** Opening balance, current balance, total spent
     - **Bills Tab:** All invoices for this client with status badges
     - **Recovery Tab:** All recovery records (direct + city-based)
  3. Can view individual invoices from the bills list
  4. Can print invoices directly from the detail view

### 6.6 Client Portal PIN Management (UC-CLI-06)
- **Actors:** Admin, Manager, Biller
- **Flow:**
   1. Click the key icon on a client card
   2. Set or change a 4+ digit PIN for client portal access
   3. **Default PIN:** Last 4 digits of the client's phone number (auto-set on client creation)
   4. Option to remove PIN (allows login without PIN)
   5. Audit log entry created

### 6.7 Quick Recovery from Client Detail (UC-CLI-07)
- **Actors:** Admin, Manager, Cashier
- **Flow:**
  1. From client detail view, click "Record Recovery"
  2. Enter amount and optional notes
  3. Confirmation dialog
  4. Recovery is recorded and client balance is updated

### 6.8 Export Clients (UC-CLI-08)
- **Format:** CSV download with client details

### 6.9 View Invoice from Client Detail (UC-CLI-09)
- **Flow:**
  1. In client detail → Bills tab → click Eye icon on an invoice
  2. Branded invoice dialog opens with:
     - Company header (logo, name, contact info)
     - Client info (name, city)
     - Items table (product, article, size, qty, pairs, rate, discount, total)
     - Totals section (subtotal, discount, tax, total, received, balance due)
  3. Print button available in the dialog

---

## 7. Invoice Management

### 7.1 View Invoices (UC-INV-LIST-01)
- **Route:** `/invoices`
- **Actors:** Admin, Manager, Biller
- **Features:**
  - **Draft Invoices Section:** Prominently displayed at the top of the page when drafts exist, showing invoice number, client, date, and amount. Click to edit directly.
  - Invoice list with: number, client name, amount, status, date, item count
  - **Search:** By invoice number or client name
  - **Filter by Status:** All, Paid, Pending, Overdue, Draft, Partial
  - **Filter by Date:** Calendar date picker
  - **Summary Stats:** Total amount, Paid, Pending, Overdue
  - **Status Badges:** Color-coded (green=paid, yellow=pending, red=overdue, gray=draft)

### 7.2 Create New Invoice (UC-INV-NEW-01)
- **Route:** `/invoices/new`
- **Actors:** Admin, Manager, Biller
- **Layout:** Two-column layout for maximum screen utilization
  - **Left Column:** Client selection + product search/selection with size bundle pickers
  - **Right Column:** Items table + payment method + summary totals + save button
- **Flow:**
  1. **Select Client:** Searchable combobox with all clients (shows phone + city + balance)
  2. **Add Products:**
     - Searchable product list on the left showing article number, name, brand
     - Select a product → see all its size bundles with +/- controls
     - Shows available quantity, pairs per bundle, price per pair
     - Click "Add to Invoice" → items appear in the right column table
  3. **Edit Line Items:**
     - Adjust bundles quantity (+ / -)
     - Edit total pairs directly (overrides bundle calculation)
     - Set discount per pair
     - Remove items (with confirmation)
  4. **Payment Section:**
     - Payment method: Cash or Account (select payment account)
     - Enter amount received
     - Credit notes: Auto-detected from client's return credit notes, applied on save
  5. **Review & Save:**
     - Review dialog shows complete invoice summary
     - Auto-generated invoice number: `INV-YYYY-XXXX`
     - Status auto-determined: `paid` if received ≥ total, `pending` otherwise
     - Saves to database: invoice record + invoice items
     - Updates client balance (adds balance due to current_balance)
     - Deducts stock from product_size_bundles
     - Audit log entry created
  6. **Save as Draft:**
     - Saves with status `draft`
     - Does NOT update stock or client balance
     - Can be edited later from the Invoices page draft section

### 7.3 Edit Draft Invoice (UC-INV-EDIT-01)
- **Route:** `/invoices/edit/:invoiceId`
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. From invoice list, click edit icon on a draft invoice
  2. Existing invoice data is loaded into the form
  3. Make changes (add/remove items, change client, etc.)
  4. Save updates or finalize the draft

### 7.4 View Invoice Detail (UC-INV-VIEW-01)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click Eye icon on an invoice row
  2. Branded dialog opens with:
     - Company header with logo and contact details
     - Client information
     - Items table with all columns
     - Totals breakdown
     - Returns section (if any returns exist for this invoice)
  3. Print button in the dialog

### 7.5 Print Invoice (UC-INV-PRINT-01)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click Printer icon on an invoice row (or from view dialog)
  2. New browser window opens with branded print layout:
     - **Header:** Company logo, "Shamshad Footwear", "Wholesale Supplier", phone numbers, address
     - **Client Info:** Bill To name and city
     - **Items Table:** #, Product, Article, Size, Qty, Pairs, Rate, Discount, Total
     - **Totals:** Subtotal, Discount, Tax, Total, Received, Balance Due
     - **Footer:** Thank you message, company info, terms
  3. Browser print dialog auto-opens
  4. Audit log entry for print action

### 7.6 Delete Invoice (UC-INV-DEL-01)
- **Actors:** Admin
- **Flow:**
  1. Click delete icon on an invoice row
  2. Confirmation dialog with invoice number
  3. Invoice items deleted first, then the invoice
  4. Audit log entry created

### 7.7 Send Invoice to Client (UC-INV-SEND-01)
- **Actors:** Admin, Manager, Biller
- **Flow:**
  1. Click send icon on an invoice row
  2. Invoice details are copied to clipboard (formatted text)
  3. User can paste into WhatsApp or email manually

### 7.8 Export Invoices (UC-INV-EXPORT-01)
- **Format:** CSV with Invoice #, Client, Amount, Status, Date, Items Count

---

## 8. Payments

### 8.1 View Payments (UC-PAY-01)
- **Route:** `/payments`
- **Actors:** Admin, Manager, Cashier
- **Features:**
  - **Payment Accounts:** List of all payment accounts (JazzCash, EasyPaisa, Bank, etc.)
  - **Incoming Payments:** From invoices (amount received > 0)
  - **Outgoing Payments:** Recovery payments to clients
  - **Filter by Date:** Calendar date picker
  - **Summary:** Total incoming vs outgoing, net balance

### 8.2 Export Payments (UC-PAY-02)
- **Format:** CSV download

---

## 9. Recovery Management

### 9.1 View Recoveries (UC-REC-01)
- **Route:** `/recovery`
- **Actors:** Admin, Manager, Cashier
- **Features:**
   - List of all recovery records
   - Two types: **Client Recovery** (direct) and **City Recovery** (grouped)
   - Search and filter capabilities
   - **Recovery Statistics:** Total, Client-wise, and City-wise breakdowns organized in collapsible sections (closed by default) to optimize vertical space

### 9.2 Record Client Recovery (UC-REC-02)
- **Flow:**
  1. Select recovery type: "Client"
  2. Select client from searchable dropdown
  3. Enter recovery amount
  4. Select date
  5. Add optional notes
  6. Confirmation dialog
  7. Recovery saved to database
  8. Client's `current_balance` is reduced by the recovery amount

### 9.3 Record City Recovery (UC-REC-03)
- **Flow:**
  1. Select recovery type: "City"
  2. Select city from dropdown
  3. System shows all clients in that city with their balances
  4. Enter recovery amount per client (individual amounts)
  5. Total is calculated automatically
  6. Select date and add notes
  7. Saves one recovery record + individual `recovery_client_amounts` records
  8. Each client's balance is updated accordingly

### 9.4 Recovery Drafts (UC-REC-04)
- **Feature:** Auto-save recovery entries as drafts
- **Flow:**
  1. While entering recovery data, drafts are auto-saved locally
  2. If the user navigates away, drafts can be resumed
  3. Managed via `useRecoveryDrafts` hook

### 9.5 Print Recovery Receipt (UC-REC-05)
- **Actors:** Admin, Manager, Cashier
- **Flow:** Print formatted recovery receipt

### 9.6 Export Recoveries (UC-REC-06)
- **Format:** CSV download

---

## 9B. City Recovery (Dedicated Page)

### 9B.1 Overview
- **Route:** `/city-recovery`
- **Actors:** Admin, Manager, Cashier
- **Purpose:** Dedicated page for city-wise recovery entry and printing, designed for non-technical field use with minimal navigation

### 9B.2 Enter Recovery Tab (UC-CREC-01)
- **Flow:**
  1. Select city from dropdown (shows all cities with clients)
  2. Select date (defaults to today)
  3. System displays all clients in selected city with current balances
  4. Enter recovery amount per client
  5. Select payment account per client (defaults to Cash)
  6. Mark clients as "collected" for tracking
  7. Click "Save Recovery" to persist
  8. Auto-saves drafts locally to prevent data loss
- **Features:**
  - Draft persistence via `useRecoveryDrafts` hook
  - Summary showing total amount and number of clients with amounts
  - Validation prevents saving with zero total

### 9B.3 Print List Tab (UC-CREC-02)
- **Flow:**
  1. Select one or more cities
  2. Reorder cities via drag-and-drop
  3. Toggle "Show Previous Balance" column
  4. Click "Print Recovery Sheet"
  5. Generates formatted print-ready recovery list grouped by city
- **Features:**
  - Multi-city selection
  - Drag-and-drop city ordering
  - Professional print layout with company header
  - Empty amount column for field use

## 10. Returns & Credit Notes

### 10.1 View Returns (UC-RET-01)
- **Route:** `/returns`
- **Actors:** Admin, Manager, Biller
- **Features:**
  - List of all return records with return number, invoice reference, client, amount, date
  - Search by return number or client name

### 10.2 Create Return (UC-RET-02)
- **Flow:**
  1. Click "New Return"
  2. Search and select the original invoice
  3. System loads all items from that invoice
  4. For each item, specify pairs to return (max = original pairs sold)
  5. Choose adjustment type:
     - **Credit Note:** Creates a credit that can be applied to future invoices
     - **Refund:** Direct monetary refund
  6. Toggle "Restock" to add returned pairs back to inventory
  7. Add optional notes
  8. Auto-generated return number: `RET-YYYY-XXXX`
  9. Confirmation → saves return record + return items
  10. If restock enabled: updates `product_size_bundles` quantities
  11. If credit note: amount is available for future invoice deduction

### 10.3 Export Returns (UC-RET-03)
- **Format:** CSV download

---

## 11. Reports & Analytics

### 11.1 View Reports (UC-REP-01)
- **Route:** `/reports`
- **Actors:** Admin, Manager
- **Features:**
  - **Summary Stats:**
    - Total Revenue
    - Total Invoices
    - Average Order Value
    - Active Clients
  - **Monthly Sales Chart:** Bar chart showing revenue per month (last 6 months)
  - **Category Distribution:** Pie chart showing revenue by product category
  - **Top Products Table:** Products ranked by units sold with revenue and growth

### 11.2 Export Reports (UC-REP-02)
- **Format:** CSV with top products data
- **Audit Log:** Export action is logged

---

## 12. User Management

### 12.1 View Users (UC-USER-01)
- **Route:** `/users`
- **Actors:** Admin only
- **Features:**
  - List of all system users with: name, email, phone, role, status, created date
  - Search by name or email
  - Role badge color-coded (Admin=red, Manager=blue, Biller=green, Cashier=yellow)
  - **Page Access Dialog:** Click on a user to view/edit their granular page permissions

### 12.2 Create User (UC-USER-02)
- **Actors:** Admin only
- **Flow:**
  1. Click "Add User"
  2. Enter: Name, Email, Password, Phone (format: `0XXX-XXXXXXX`)
  3. Select role: Admin, Manager, Biller, Cashier
  4. System creates auth user + profile + role record
  5. Default page permissions applied based on role
  6. Audit log entry created

### 12.6 Manage Page Access (UC-USER-06)
- **Actors:** Admin only
- **Flow:**
  1. Click the shield/permissions icon on a user row
  2. Dialog shows all pages with toggle switches
  3. Each toggle shows the effective access (role default + override)
  4. Admin can grant or revoke access to specific pages
  5. Overrides are stored in `user_page_permissions` table
  6. Changes take effect immediately on the user's next page load

### 12.3 Edit User (UC-USER-03)
- **Actors:** Admin only
- **Flow:**
  1. Click edit icon on a user row
  2. Modify: Name, Email, Phone, Role
  3. Save updates to profile and role tables

### 12.4 Toggle User Active Status (UC-USER-04)
- **Actors:** Admin only
- **Flow:**
  1. Click activate/deactivate icon
  2. Confirmation dialog
  3. User's `is_active` flag is toggled
  4. Inactive users cannot log in

### 12.5 Delete User (UC-USER-05)
- **Actors:** Admin only
- **Flow:**
  1. Click delete icon
  2. Confirmation dialog
  3. Role and profile records are deleted
  4. Cannot delete your own account

---

## 13. Audit Logs

### 13.1 View Audit Logs (UC-AUDIT-01)
- **Route:** `/audit-logs`
- **Actors:** Admin, Manager
- **Features:**
  - Chronological list of all system actions
  - Each entry shows: timestamp, user name, action, entity type, entity ID, details
  - **Action Types:** login, logout, create, update, delete, view, save_draft, export, import, print
  - **Entity Types:** user, product, brand, client, invoice, recovery, payment, settings, report
  - **Search:** By user name or entity type
  - **Filter by Action:** Dropdown filter
  - **Filter by Entity:** Dropdown filter
  - **Color-coded badges:** Green=create/login, Yellow=update/draft, Red=delete
  - **Entity icons:** Different icons per entity type

### 13.2 Export Audit Logs (UC-AUDIT-02)
- **Format:** CSV download
- **Columns:** Timestamp, User, Action, Entity Type, Entity ID, Details

### 13.3 Refresh Audit Logs (UC-AUDIT-03)
- **Feature:** Manual refresh button to load latest entries

---

## 14. Settings

### 14.1 Profile Settings (UC-SET-01)
- **Route:** `/settings`
- **Actors:** All authenticated users
- **Features:**
  - Edit personal profile: Name, Email, Phone
  - Save changes to profiles table

### 14.2 Payment Accounts (UC-SET-02)
- **Actors:** Admin, Manager
- **Features:**
  - View all payment accounts
  - Add new payment account (name)
  - Delete payment account

### 14.3 Product Categories (UC-SET-03)
- **Actors:** Admin, Manager
- **Features:**
  - View all product categories
  - Add new category with display order
  - Delete category
  - Drag to reorder (display_order)

### 14.4 Default Size Ranges (UC-SET-04)
- **Actors:** Admin, Manager
- **Features:**
  - Configure default size ranges per gender category (men, women, children, unisex)
  - Each size range: size string, pairs per bundle, display order
  - Add / delete size ranges
  - These defaults populate the size bundle options when adding products

### 14.5 Security Settings (UC-SET-05)
- **Actors:** Admin only
- **Features:**
  - **Admin PIN:** Set a 4-6 digit PIN required on login for extra security
  - **Session Timeout:** Configure auto-logout timeout (in minutes)
  - **Single Session Enforcement:** Prevent users from logging in from multiple devices

### 14.6 Notification Settings (UC-SET-06)
- **Actors:** Admin only
- **Features:**
  - Toggle low stock alerts
  - Toggle payment reminders
  - Toggle daily summaries

### 14.7 Data Backup & Restore (UC-SET-07)
- **Actors:** Admin only
- **Features:**
  - Export all application data as JSON backup
  - Restore from a previously exported backup file
  - Managed via `DataBackupRestore` component

---

## 15. Client Portal

### 15.1 Portal Login (UC-PORTAL-01)
- **Route:** `/portal`
- **Actors:** External clients (customers)
- **Flow:**
  1. Client enters phone number (formatted as `0XXX-XXXXXXX`, auto-formatted on input)
  2. If client has a PIN set, enter the PIN
  3. System calls the `client-portal-login` edge function
  4. Edge function:
     - Looks up client by phone number (using service role, bypasses RLS)
     - Verifies PIN if set
     - Returns client data, invoices, and recovery records
  5. On success, client sees their portal dashboard

### 15.2 Portal Dashboard (UC-PORTAL-02)
- **Actors:** Authenticated client
- **Features:**
  - **Account Summary Card:**
    - Client name, phone, email, address, city
    - Current balance, total spent, invoice count
  - **Tabs:**
    - **Invoices Tab:** List of all invoices with number, date, total, status
    - **Recoveries Tab:** List of all recovery payments with date, amount, notes

### 15.3 View Invoice from Portal (UC-PORTAL-03)
- **Actors:** Authenticated client
- **Flow:**
  1. Click Eye icon on an invoice in the list
  2. Branded invoice dialog opens (same layout as admin-side view)
  3. Shows: company header, items table, totals, returns info
  4. **Print button** available to print the invoice

### 15.4 Portal Phone Validation (UC-PORTAL-04)
- **Validation:** Phone input enforces same `0XXX-XXXXXXX` pattern as admin-side client creation
- **Auto-formatting:** As user types, digits are auto-formatted with dash after 4th digit
- **Max length:** 12 characters (including dash)

---

## 16. Branding & Print Layout

### 16.1 Company Branding
- **Logo:** 512×512px PNG used across the app
- **Color Theme:** Warm beige (`#F0E8D8`) and charcoal (`#3D3D3D`)
- **Company Name:** Shamshad Footwear
- **Tagline:** Wholesale Supplier
- **Contact:** 0315-7162093 | 0305-5388093
- **Address:** Faisalabad Road, Chowk Azam, Layyah

### 16.2 Print Invoice Layout
- **Header:** Logo + Company name + tagline + contact info + invoice number + date
- **Body:** Bill-to info → items table → totals
- **Footer:** Thank you message + company info + terms
- **Auto-print:** `window.print()` triggers automatically

### 16.4 Dual Printer Support (A4 + 80mm Slip)
The system supports printing to both standard **A4** printers and **80mm thermal slip** printers using the browser's native print dialog.

- **Paper sizes:**
  - `A4` — full-page layout (210mm), 10mm margins, 11px font, branded header/footer
  - `slip80` — 80mm wide, auto-height, 10px font, dashed dividers, single-column blocks (optimized for thermal cutting)
- **Per-document defaults** (configurable in **Settings → Printing**):
  - Invoices / Bills → Slip 80mm (default)
  - Payment Receipts → Slip 80mm (default)
  - Recovery Lists, Client History, Cheques, Returns → A4 (default)
- **Override per print:** Every Print button is a split-button — main click uses the saved default, the caret menu lets the user override to A4 or Slip for that single print.
- **Implementation:**
  - `src/utils/printUtils.ts` — exports `PaperSize` type and emits paper-specific `@page` + body styles inside `generateBrandedPrintPage`.
  - `src/utils/printPreferences.ts` — `localStorage`-backed store (`getPrintDefault` / `setPrintDefault` / `getAllPrintDefaults`).
  - `src/components/common/PrintButton.tsx` — shared split-button component used across all printable views.
- **Printer setup:** The OS print dialog lets the user pick the physical printer. For one-click printing, set the desired physical printer (A4 or thermal) as the system default in Windows/Android. The CSS `@page size: 80mm auto` instructs Chrome/Edge to render the slip at the correct width.
- **Coverage:** Invoices (`Invoices.tsx`, `NewInvoice.tsx`, `InvoiceViewDialog`), Recovery (`Recovery.tsx`, `CityRecovery.tsx`), Client History (bills / recoveries / manual bills / complete history) all support both paper sizes.

### 16.3 Asset Requirements
| Asset | Dimensions | Location | Purpose |
|-------|-----------|----------|---------|
| Logo | 512×512 px | `src/assets/logo.png` | Sidebar, Login, Print headers |
| Favicon | 32×32 px (auto-scaled) | `public/favicon.png` | Browser tab icon |
| PWA Icon | 512×512 px | `public/logo-512.png` | Mobile home screen |
| OG Image | 1200×630 px | TBD | Social sharing previews |

---

## 17. PWA & Mobile Support

### 17.1 Progressive Web App
- **Manifest:** `public/manifest.json` configured with app name, icons, theme color, orientation, categories
- **Orientation:** `portrait-primary` (optimized for mobile use)
- **Categories:** `business`, `productivity`, `finance`
- **Installable:** Can be added to mobile home screen via custom install prompt
- **Theme Color:** `#F0E8D8` (warm beige)
- **Shortcuts:** Home screen long-press shortcuts for quick access:
  - New Invoice (`/invoices/new`)
  - Inventory (`/inventory`)
  - Clients (`/clients`)
  - Recovery (`/recovery`)

### 17.2 Custom Install Prompt (`InstallPrompt`)
- **Component:** `src/components/layout/InstallPrompt.tsx`
- **Android/Chrome:** Intercepts `beforeinstallprompt` event and shows a branded install banner
- **iOS/Safari:** Detects iOS devices and displays a step-by-step guide (Share → Add to Home Screen)
- **Dismissal:** Remembers user dismissal for 7 days via `localStorage`
- **Auto-hide:** Hidden when app is already running in standalone mode

### 17.3 Android TWA (Trusted Web Activity)
- **Asset Links:** `public/.well-known/assetlinks.json` configured for domain verification
- **Package:** `com.shamshadfootwear.twa`

### 17.4 PWA Update Strategy
- **Component:** `src/components/layout/PwaUpdatePrompt.tsx`
- **Strategy:** Prompt-based — user is notified when a new version is available and can choose to update
- **Caching:** `NetworkFirst` for API calls, `NetworkOnly` for auth endpoints to prevent stale cache issues

### 17.5 Responsive Design
- **Breakpoints:** Mobile-first with `sm:`, `md:`, `lg:` Tailwind breakpoints
- **Mobile Sidebar:** Collapsible hamburger menu via `MobileSidebar` component
- **Card Layouts:** Grid switches from 1 column (mobile) to 2-4 columns (desktop)
- **Tables:** Horizontal scroll on mobile
- **Dialogs:** Max height `90vh` with scroll on mobile

---

## 18. Data Export & Import

### 18.1 CSV Export
- **Utility:** `src/utils/exportUtils.ts` → `exportToCSV()` function
- **Available Exports:**
  - Inventory/Products
  - Clients
  - Invoices
  - Payments
  - Recoveries
  - Audit Logs
  - Reports (Top Products)
- **Format:** CSV with customizable columns and formatters
- **Filename:** Auto-generated with entity name and timestamp

### 18.2 CSV Import
- **Utility:** `src/utils/importUtils.ts`
- **Available Imports:** Products/Inventory
- **Flow:** File upload → parse → validate → bulk insert

### 18.3 JSON Backup/Restore
- **Location:** Settings → Data Backup & Restore
- **Backup:** Exports all tables as a single JSON file
- **Restore:** Imports from a previously exported JSON file

---

## 19. Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, email, phone, avatar) |
| `user_roles` | Maps users to roles (admin, manager, biller, cashier) |
| `user_page_permissions` | Per-user page access overrides |
| `user_sessions` | Active session tracking for single-session enforcement |
| `admin_security_settings` | PIN, timeout, session settings per admin |
| `brands` | Footwear brand names |
| `products` | Product catalog (name, article number, brand, category, gender, stock) |
| `product_size_bundles` | Size-specific pricing and quantity per product |
| `product_categories` | Custom product categories with display order |
| `default_size_ranges` | Default size range templates per gender category |
| `clients` | Customer records with balance tracking |
| `invoices` | Invoice headers (totals, status, payment info) |
| `invoice_items` | Invoice line items (product, size, qty, pricing) |
| `payment_accounts` | Payment method accounts (JazzCash, Bank, etc.) |
| `recoveries` | Debt recovery records (client or city type) |
| `recovery_client_amounts` | Per-client amounts in city recoveries |
| `returns` | Return/credit note headers |
| `return_items` | Individual returned items |
| `audit_logs` | System activity log |
| `notifications` | User notifications |
| `application_settings` | Key-value application configuration |

### Key Relationships
```
brands ──< products ──< product_size_bundles
                    ──< invoice_items
                    ──< return_items

clients ──< invoices ──< invoice_items
        ──< recoveries
        ──< recovery_client_amounts
        ──< returns

invoices ──< returns ──< return_items
         ──< invoice_items

payment_accounts ──< invoices

recoveries ──< recovery_client_amounts
```

---

## 20. Role-Based Access Control Matrix

### Default Page Access by Role

| Page | Admin | Manager | Biller | Cashier | Biller+Cashier |
|------|:-----:|:-------:|:------:|:-------:|:--------------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ | ❌ | ✅ |
| Add Product | ✅ | ✅ | ✅ | ❌ | ✅ |
| Price Check | ✅ | ✅ | ✅ | ❌ | ✅ |
| Clients | ✅ | ✅ | ✅ | ❌ | ✅ |
| Add Client | ✅ | ✅ | ✅ | ❌ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ❌ | ✅ |
| Payments | ✅ | ✅ | ❌ | ✅ | ✅ |
| Cheques | ✅ | ✅ | ❌ | ✅ | ✅ |
| Recovery | ✅ | ✅ | ❌ | ✅ | ✅ |
| City Recovery | ✅ | ✅ | ❌ | ✅ | ✅ |
| Returns | ✅ | ✅ | ✅ | ❌ | ✅ |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

### Granular Page Overrides
- Admins can customize any user's page access beyond their role defaults
- Overrides are stored in `user_page_permissions` table
- Effective access = `COALESCE(override, role_default)`
- Admin users always have full access (overrides are ignored)

---

## Appendix: Edge Functions

### `client-portal-login`
- **Purpose:** Authenticates clients for the portal using phone + PIN
- **Method:** POST
- **Input:** `{ phone: string, pin?: string }`
- **Output:** `{ client: {...}, invoices: [...], directRecoveries: [...], cityAmounts: [...] }`
- **Security:** Uses service role key to bypass RLS; PIN verified server-side
- **Error Codes:**
  - 400: Phone number missing
  - 401: Invalid PIN
  - 404: No client found with that phone number
  - 500: Server error

---

*This document is auto-generated from the application source code and represents the complete feature set as of March 2026.*
