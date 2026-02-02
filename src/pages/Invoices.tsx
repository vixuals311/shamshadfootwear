import { useState, useMemo, useEffect } from "react";
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
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  number: string;
  client: string;
  clientEmail: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft" | "partial";
  date: string;
  dueDate: string;
  items: number;
}

const statusStyles = {
  paid: "status-badge-success",
  pending: "status-badge-warning",
  overdue: "status-badge-danger",
  draft: "status-badge-default",
  partial: "status-badge-warning",
};

const Invoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch invoices from Supabase
  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          status,
          created_at,
          clients (name, email),
          invoice_items (id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedInvoices: Invoice[] = (data || []).map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number,
        client: inv.clients?.name || "Unknown Client",
        clientEmail: inv.clients?.email || "",
        amount: inv.total,
        status: inv.status as Invoice["status"],
        date: inv.created_at,
        dueDate: inv.created_at, // Could add due_date column later
        items: inv.invoice_items?.length || 0,
      }));

      setInvoices(formattedInvoices);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      // Date filter
      const matchesDate = !selectedDate || 
        format(new Date(invoice.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, selectedDate]);

  const handleDeleteInvoice = async (id: string) => {
    try {
      // Delete invoice items first
      await supabase.from("invoice_items").delete().eq("invoice_id", id);
      
      // Delete invoice
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Success", description: "Invoice deleted" });
      fetchInvoices();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices.filter((inv) => inv.status === "pending" || inv.status === "partial").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = invoices.filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <p className="text-2xl font-bold text-foreground">Rs {stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Paid</p>
          <p className="text-2xl font-bold text-success">Rs {stats.paid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-warning">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-warning">Rs {stats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground mb-1">Overdue</p>
          <p className="text-2xl font-bold text-destructive">Rs {stats.overdue.toLocaleString()}</p>
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
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("gap-2", selectedDate && "text-primary")}>
                <Calendar className="w-4 h-4" />
                {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
              {selectedDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedDate(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
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
                    Rs {invoice.amount.toLocaleString()}
                  </td>
                  <td>
                    <span className={cn("status-badge capitalize", statusStyles[invoice.status])}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {format(new Date(invoice.date), "dd MMM yyyy")}
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
