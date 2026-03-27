import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Download,
  FileText,
  MoreHorizontal,
  Eye,
  Printer,
  Send,
  Trash2,
  Calendar,
  Loader2,
  Edit,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { exportToCSV } from "@/utils/exportUtils";
import { InvoiceViewDialog } from "@/components/dashboard/InvoiceViewDialog";

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

interface ReturnInfo {
  id: string;
  return_number: string;
  total_amount: number;
  adjustment_type: string;
  created_at: string;
  items: { product_name: string; size_range: string; pairs_returned: number; total: number }[];
}

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  created_at: string;
  client_name: string;
  client_city: string;
  subtotal: number;
  total_discount: number;
  tax: number;
  total: number;
  amount_received: number;
  balance_due: number;
  total_bundles: number;
  credit_applied?: number;
  status: string;
  items: any[];
  returns?: ReturnInfo[];
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
  const { log } = useAuditLog();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [deleteInvoiceNumber, setDeleteInvoiceNumber] = useState<string>("");
  
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

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
        dueDate: inv.created_at,
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
      
      const matchesDate = !selectedDate || 
        format(new Date(invoice.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, selectedDate]);

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    
    try {
      await supabase.from("invoice_items").delete().eq("invoice_id", deleteInvoiceId);
      
      const { error } = await supabase.from("invoices").delete().eq("id", deleteInvoiceId);
      if (error) throw error;

      await log({
        action: "delete",
        entityType: "invoice",
        entityId: deleteInvoiceId,
        details: { invoice_number: deleteInvoiceNumber },
      });

      toast({ title: "Success", description: "Invoice deleted" });
      setDeleteInvoiceId(null);
      setDeleteInvoiceNumber("");
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

  const handleEditDraft = (invoiceId: string) => {
    navigate(`/invoices/edit/${invoiceId}`);
  };

  // View invoice
  const handleViewInvoice = async (invoiceId: string) => {
    try {
      setLoadingInvoice(true);
      
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          created_at,
          subtotal,
          total_discount,
          tax,
          total,
          amount_received,
          balance_due,
          total_bundles,
          credit_applied,
          status,
          clients (name, city),
          invoice_items (id, product_name, article_number, size_range, quantity, total_pairs, price_per_pair, discount_per_pair, total)
        `)
        .eq("id", invoiceId)
        .single();

      if (error) throw error;

      // Fetch returns for this invoice
      const { data: returnsData } = await supabase
        .from("returns")
        .select(`
          id, return_number, total_amount, adjustment_type, created_at,
          return_items (product_name, size_range, pairs_returned, total)
        `)
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });

      setSelectedInvoice({
        id: data.id,
        invoice_number: data.invoice_number,
        created_at: data.created_at,
        client_name: data.clients?.name || "Unknown",
        client_city: data.clients?.city || "",
        subtotal: data.subtotal,
        total_discount: data.total_discount,
        tax: data.tax,
        total: data.total,
        amount_received: data.amount_received,
        balance_due: data.balance_due,
        total_bundles: data.total_bundles || 0,
        credit_applied: data.credit_applied || 0,
        status: data.status,
        items: data.invoice_items || [],
        returns: (returnsData || []).map((r: any) => ({
          id: r.id,
          return_number: r.return_number,
          total_amount: r.total_amount,
          adjustment_type: r.adjustment_type,
          created_at: r.created_at,
          items: r.return_items || [],
        })),
      });
      
      setViewDialogOpen(true);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Print invoice
  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          created_at,
          subtotal,
          total_discount,
          tax,
          total,
          amount_received,
          balance_due,
          status,
          clients (name, city),
          invoice_items (id, product_name, article_number, size_range, quantity, total_pairs, price_per_pair, discount_per_pair, total)
        `)
        .eq("id", invoiceId)
        .single();

      if (error) throw error;

      const printContent = generatePrintContent(data);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
      }

      await log({
        action: "print",
        entityType: "invoice",
        entityId: invoiceId,
        details: { invoice_number: data.invoice_number },
      });
    } catch (error: any) {
      console.error("Error printing invoice:", error);
      toast({
        title: "Error",
        description: "Failed to print invoice",
        variant: "destructive",
      });
    }
  };

  // Generate print content
  const generatePrintContent = (invoice: any) => {
    const logoUrl = window.location.origin + '/favicon.png';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #3D3D3D; }
          .brand-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 20px; background: #F0E8D8; border-radius: 12px; }
          .brand-left { display: flex; align-items: center; gap: 14px; }
          .brand-left img { width: 56px; height: 56px; object-fit: contain; }
          .brand-left h2 { margin: 0; font-size: 18px; color: #3D3D3D; }
          .brand-left p { margin: 2px 0 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #888; }
          .brand-left .contact { font-size: 11px; letter-spacing: 0; text-transform: none; color: #666; margin-top: 4px; }
          .brand-right { text-align: right; font-size: 13px; color: #666; }
          .brand-right p { margin: 2px 0; }
          .client-info { margin-bottom: 20px; }
          .client-info .label { font-size: 11px; color: #888; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #F0E8D8; color: #3D3D3D; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; font-size: 14px; }
          .total-final { font-size: 1.2em; font-weight: bold; border-top: 2px solid #3D3D3D; padding-top: 10px; margin-top: 10px; }
          .brand-footer { margin-top: 40px; padding: 16px; background: #F0E8D8; border-radius: 12px; text-align: center; }
          .brand-footer p { margin: 4px 0; font-size: 11px; color: #666; }
          .brand-footer .company { font-weight: bold; color: #3D3D3D; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <div class="brand-left">
            <img src="${logoUrl}" alt="Shamshad Footwear" />
            <div>
              <h2>Shamshad Footwear</h2>
              <p>Wholesale Supplier</p>
              <p class="contact">0315-7162093 | 0305-5388093</p>
              <p class="contact">Faisalabad Road, Chowk Azam, Layyah</p>
            </div>
          </div>
          <div class="brand-right">
            <p><strong>${invoice.invoice_number}</strong></p>
            <p>${format(new Date(invoice.created_at), "dd MMM yyyy")}</p>
          </div>
        </div>
        
        <div class="client-info">
          <p class="label">Bill To:</p>
          <p><strong>${invoice.clients?.name || "N/A"}</strong></p>
          <p>${invoice.clients?.city || ""}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Article</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Pairs</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.invoice_items || []).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.product_name}</td>
                <td>${item.article_number}</td>
                <td>${item.size_range}</td>
                <td>${item.quantity}</td>
                <td>${item.total_pairs}</td>
                <td>Rs ${item.price_per_pair}</td>
                <td>Rs ${item.discount_per_pair}</td>
                <td>Rs ${item.total.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: Rs ${invoice.subtotal.toLocaleString()}</p>
          ${invoice.total_discount > 0 ? `<p>Discount: - Rs ${invoice.total_discount.toLocaleString()}</p>` : ""}
          ${invoice.tax > 0 ? `<p>Tax: Rs ${invoice.tax.toLocaleString()}</p>` : ""}
          <p class="total-final">Total: Rs ${invoice.total.toLocaleString()}</p>
          ${invoice.amount_received > 0 ? `<p>Received: Rs ${invoice.amount_received.toLocaleString()}</p>` : ""}
          ${invoice.balance_due > 0 ? `<p>Balance Due: Rs ${invoice.balance_due.toLocaleString()}</p>` : ""}
        </div>

        <div class="brand-footer">
          <p>Goods once sold will not be returned without prior agreement.</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;
  };

  // Send to client (via WhatsApp or share)
  const handleSendToClient = async (invoice: Invoice) => {
    const message = `Invoice ${invoice.number}\nAmount: Rs ${invoice.amount.toLocaleString()}\nStatus: ${invoice.status}`;
    
    if (invoice.clientEmail) {
      // If client has phone, use WhatsApp
      const phone = invoices.find(i => i.id === invoice.id);
      // For now, just copy to clipboard
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied to Clipboard",
        description: "Invoice details copied. You can share via WhatsApp or email.",
      });
    } else {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied to Clipboard",
        description: "Invoice details copied to clipboard.",
      });
    }

    await log({
      action: "export",
      entityType: "invoice",
      entityId: invoice.id,
      details: { invoice_number: invoice.number, method: "send_to_client" },
    });
  };

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices.filter((inv) => inv.status === "pending" || inv.status === "partial").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = invoices.filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  const handleExportInvoices = () => {
    exportToCSV(
      filteredInvoices,
      [
        { key: "number", header: "Invoice #" },
        { key: "client", header: "Client Name" },
        { key: "clientEmail", header: "Client Email" },
        { 
          key: "amount", 
          header: "Amount", 
          format: (val: number) => `Rs ${val.toLocaleString()}` 
        },
        { key: "status", header: "Status" },
        { 
          key: "date", 
          header: "Date", 
          format: (val: string) => format(new Date(val), "dd MMM yyyy") 
        },
        { key: "items", header: "Items Count" },
      ],
      "invoices"
    );
    
    log({
      action: "export",
      entityType: "invoice",
      details: { count: filteredInvoices.length, type: "csv" },
    });
    
    toast({ title: "Success", description: "Invoices exported successfully" });
  };

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
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportInvoices}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>
      </motion.div>

      {/* Draft Invoices Section */}
      {invoices.filter(inv => inv.status === "draft").length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-xl p-4 shadow-card border-l-4 border-l-muted-foreground"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Draft Invoices ({invoices.filter(inv => inv.status === "draft").length})
            </h3>
          </div>
          <div className="space-y-2">
            {invoices.filter(inv => inv.status === "draft").map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{draft.client}</p>
                    <p className="text-xs text-muted-foreground truncate">{draft.number} • {format(new Date(draft.date), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">Rs {draft.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{draft.items} items</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleEditDraft(draft.id)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Invoiced</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">Rs {stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card border-l-4 border-l-success">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Paid</p>
          <p className="text-lg sm:text-2xl font-bold text-success">Rs {stats.paid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card border-l-4 border-l-warning">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-warning">Rs {stats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card border-l-4 border-l-destructive">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Overdue</p>
          <p className="text-lg sm:text-2xl font-bold text-destructive">Rs {stats.overdue.toLocaleString()}</p>
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

      {/* Invoices - Mobile Card View */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="sm:hidden space-y-3"
      >
        {filteredInvoices.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No invoices found</h3>
            <p className="text-muted-foreground">Try adjusting your search or create a new invoice.</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{invoice.number}</p>
                    <p className="text-sm text-muted-foreground truncate">{invoice.client}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {invoice.status === "draft" && (
                      <DropdownMenuItem className="gap-2" onClick={() => handleEditDraft(invoice.id)}>
                        <Edit className="w-4 h-4" /> Edit Draft
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="gap-2" onClick={() => handleViewInvoice(invoice.id)}>
                      <Eye className="w-4 h-4" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => handlePrintInvoice(invoice.id)}>
                      <Printer className="w-4 h-4" /> Print
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => handleSendToClient(invoice)}>
                      <Send className="w-4 h-4" /> Send
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => { setDeleteInvoiceId(invoice.id); setDeleteInvoiceNumber(invoice.number); }}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold text-foreground">Rs {invoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm text-foreground">{format(new Date(invoice.date), "dd MMM yyyy")}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={cn("status-badge capitalize text-xs", statusStyles[invoice.status])}>
                  {invoice.status}
                </span>
              </div>
            </div>
          ))
        )}
      </motion.div>

      {/* Invoices - Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden sm:block bg-card rounded-xl shadow-card overflow-hidden"
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
                        <p className="font-medium text-foreground">{invoice.number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.items} items</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{invoice.client}</p>
                      <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                    </div>
                  </td>
                  <td className="font-semibold text-foreground">Rs {invoice.amount.toLocaleString()}</td>
                  <td>
                    <span className={cn("status-badge capitalize", statusStyles[invoice.status])}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{format(new Date(invoice.date), "dd MMM yyyy")}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invoice.status === "draft" && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleEditDraft(invoice.id)}>
                            <Edit className="w-4 h-4" /> Edit Draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2" onClick={() => handleViewInvoice(invoice.id)}>
                          <Eye className="w-4 h-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handlePrintInvoice(invoice.id)}>
                          <Printer className="w-4 h-4" /> Print
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handleSendToClient(invoice)}>
                          <Send className="w-4 h-4" /> Send to Client
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => { setDeleteInvoiceId(invoice.id); setDeleteInvoiceNumber(invoice.number); }}>
                          <Trash2 className="w-4 h-4" /> Delete
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
            <h3 className="text-lg font-medium text-foreground mb-1">No invoices found</h3>
            <p className="text-muted-foreground">Try adjusting your search or create a new invoice.</p>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice <strong>{deleteInvoiceNumber}</strong>? 
              This action cannot be undone and will remove all associated invoice items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteInvoice}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Invoice Dialog */}
      <InvoiceViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        invoice={selectedInvoice}
        onPrint={() => selectedInvoice && handlePrintInvoice(selectedInvoice.id)}
      />
    </div>
  );
};

export default Invoices;
