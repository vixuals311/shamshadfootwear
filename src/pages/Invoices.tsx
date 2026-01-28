import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Filter,
  Download,
  FileText,
  MoreHorizontal,
  Eye,
  Printer,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  client: string;
  clientEmail: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft";
  date: string;
  dueDate: string;
  items: number;
}

const initialInvoices: Invoice[] = [
  { id: "1", number: "INV-2024-001", client: "Acme Corp", clientEmail: "billing@acme.com", amount: 2500, status: "paid", date: "2024-01-15", dueDate: "2024-02-15", items: 5 },
  { id: "2", number: "INV-2024-002", client: "Stark Industries", clientEmail: "accounts@stark.com", amount: 8750, status: "pending", date: "2024-01-18", dueDate: "2024-02-18", items: 12 },
  { id: "3", number: "INV-2024-003", client: "Wayne Enterprises", clientEmail: "finance@wayne.com", amount: 4200, status: "overdue", date: "2024-01-05", dueDate: "2024-01-20", items: 8 },
  { id: "4", number: "INV-2024-004", client: "Oscorp", clientEmail: "billing@oscorp.com", amount: 1890, status: "paid", date: "2024-01-20", dueDate: "2024-02-20", items: 3 },
  { id: "5", number: "INV-2024-005", client: "Umbrella Corp", clientEmail: "payments@umbrella.com", amount: 3650, status: "pending", date: "2024-01-22", dueDate: "2024-02-22", items: 6 },
  { id: "6", number: "INV-2024-006", client: "Cyberdyne Systems", clientEmail: "accounts@cyberdyne.com", amount: 12400, status: "draft", date: "2024-01-25", dueDate: "2024-02-25", items: 15 },
];

const statusStyles = {
  paid: "status-badge-success",
  pending: "status-badge-warning",
  overdue: "status-badge-danger",
  draft: "status-badge-default",
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleDeleteInvoice = (id: string) => {
    setInvoices(invoices.filter((inv) => inv.id !== id));
  };

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices.filter((inv) => inv.status === "pending").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = invoices.filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground">
            Create and manage your invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold text-foreground">${stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Paid</p>
          <p className="text-2xl font-bold text-success">${stats.paid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-warning">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-warning">${stats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground mb-1">Overdue</p>
          <p className="text-2xl font-bold text-destructive">${stats.overdue.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices by number or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </Button>
        </div>
      </motion.div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="group cursor-pointer"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {invoice.number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.items} items
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{invoice.client}</p>
                      <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                    </div>
                  </td>
                  <td className="font-semibold text-foreground">
                    ${invoice.amount.toLocaleString()}
                  </td>
                  <td>
                    <span className={cn("status-badge capitalize", statusStyles[invoice.status])}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="text-muted-foreground">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Printer className="w-4 h-4" />
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Send className="w-4 h-4" />
                          Send to Client
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No invoices found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or create a new invoice.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Invoices;
