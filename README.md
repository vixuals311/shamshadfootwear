# Shamshad Footwear — Business Management System

A wholesale footwear business management PWA for **Shamshad Footwear**, Chowk Azam, Layyah.

**Live App:** [shamshadfootwear.lovable.app](https://shamshadfootwear.lovable.app)

## Features

- **Inventory Management** — Products, brands, size bundles, stock tracking
- **Client Management** — Customer records, balances, city-based grouping
- **Invoicing** — Create, print, and manage invoices with auto-stock deduction
- **Payments & Recovery** — Track payments, record debt recoveries (client & city-based)
- **Returns & Credit Notes** — Process returns with optional restock and credit application
- **Reports & Analytics** — Revenue charts, top products, category breakdowns
- **Client Portal** — Self-service portal for clients to view invoices and balances
- **Role-Based Access Control** — Admin, Manager, Biller, Cashier roles with granular per-user page overrides
- **Audit Logs** — Complete activity trail for all system actions
- **PWA Support** — Installable on mobile devices

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Framer Motion |
| State | TanStack React Query |
| Backend | Lovable Cloud (PostgreSQL, Auth, Edge Functions) |
| Charts | Recharts |

## Development

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for comprehensive use cases, database schema, and RBAC matrix.

## Deployment

The app is deployed via [Lovable](https://lovable.dev). Frontend updates require clicking "Update" in the publish dialog. Backend changes (edge functions, migrations) deploy automatically.
