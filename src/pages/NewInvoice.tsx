import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Save,
  Printer,
  FileCheck,
  User,
  Package,
  Calculator,
  Check,
  Minus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InvoiceItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  current_balance: number;
}

interface Product {
  id: string;
  name: string;
  article_number: string;
  brand_name: string;
  category: string;
  stock_dozens: number;
  pairs_per_dozen: number;
  size_bundles: SizeBundlePricing[];
}

interface SizeBundlePricing {
  size_range: string;
  price_per_pair: number;
  pairs_per_bundle: number;
}

interface PaymentAccount {
  id: string;
  name: string;
}

interface SizeBundleSelection {
  sizeRange: string;
  bundles: number;
  pairsPerBundle: number;
  pricePerPair: number;
}

const NewInvoice = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const isEditMode = !!invoiceId;
  const { toast } = useToast();
  const { log } = useAuditLog();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "account">("cash");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState<string | null>(null);

  // Confirmation dialogs
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Multi-size selection with individual bundle counts
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sizeSelections, setSizeSelections] = useState<SizeBundleSelection[]>([]);
  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name, phone, city, current_balance")
          .order("name");

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        // Fetch products with size bundles
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id, name, article_number, category, stock_dozens, pairs_per_dozen,
            brands (name),
            product_size_bundles (size_range, price_per_pair, pairs_per_bundle)
          `)
          .order("article_number");

        if (productsError) throw productsError;

        const formattedProducts: Product[] = (productsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          article_number: p.article_number,
          brand_name: p.brands?.name || "Unknown",
          category: p.category,
          stock_dozens: p.stock_dozens,
          pairs_per_dozen: p.pairs_per_dozen,
          size_bundles: p.product_size_bundles || [],
        }));

        setProducts(formattedProducts);

        // Fetch payment accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from("payment_accounts")
          .select("*")
          .order("name");

        if (accountsError) throw accountsError;
        setPaymentAccounts(accountsData || []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Fetch existing invoice data if in edit mode
  useEffect(() => {
    const fetchExistingInvoice = async () => {
      if (!invoiceId || clients.length === 0) return;
      
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select(`
            *,
            invoice_items (*)
          `)
          .eq("id", invoiceId)
          .single();

        if (invoiceError) throw invoiceError;
        if (!invoiceData) {
          toast({
            title: "Error",
            description: "Invoice not found",
            variant: "destructive",
          });
          navigate("/invoices");
          return;
        }

        // Set invoice number
        setExistingInvoiceNumber(invoiceData.invoice_number);

        // Set client
        const client = clients.find(c => c.id === invoiceData.client_id);
        if (client) setSelectedClient(client);

        // Set payment info
        setPaymentMethod(invoiceData.payment_method as "cash" | "account");
        if (invoiceData.account_id) setSelectedAccount(invoiceData.account_id);
        if (invoiceData.amount_received > 0) setAmountReceived(invoiceData.amount_received.toString());
        if (invoiceData.tax > 0) {
          const taxPct = (invoiceData.tax / (invoiceData.subtotal - invoiceData.total_discount)) * 100;
          setTaxPercent(Math.round(taxPct));
        }

        // Set items
        const formattedItems: InvoiceItem[] = (invoiceData.invoice_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id || "",
          productName: item.product_name,
          articleNumber: item.article_number,
          brandName: item.brand_name || "",
          sizeRange: item.size_range,
          quantity: item.quantity,
          totalPairs: item.total_pairs,
          pricePerPair: item.price_per_pair,
          discountPerPair: item.discount_per_pair,
          total: item.total,
        }));

        setItems(formattedItems);
      } catch (error: any) {
        console.error("Error fetching invoice:", error);
        toast({
          title: "Error",
          description: "Failed to load invoice",
          variant: "destructive",
        });
      }
    };

    fetchExistingInvoice();
  }, [invoiceId, clients, toast, navigate]);

  // Initialize size selections when product is selected
  const handleProductSelect = useCallback((product: Product) => {
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(null);
      setSizeSelections([]);
    } else {
      setSelectedProduct(product);
      setSizeSelections(
        product.size_bundles.map((sb) => ({
          sizeRange: sb.size_range,
          bundles: 0,
          pairsPerBundle: sb.pairs_per_bundle,
          pricePerPair: sb.price_per_pair,
        }))
      );
    }
  }, [selectedProduct]);

  const updateSizeBundles = (sizeRange: string, bundles: number) => {
    setSizeSelections((prev) =>
      prev.map((s) =>
        s.sizeRange === sizeRange ? { ...s, bundles: Math.max(0, bundles) } : s
      )
    );
  };

  const addSelectedSizesToInvoice = () => {
    if (!selectedProduct) return;

    const selectedSizes = sizeSelections.filter((s) => s.bundles > 0);
    if (selectedSizes.length === 0) return;

    setItems((prevItems) => {
      let newItems = [...prevItems];

      selectedSizes.forEach((selection) => {
        const existingItemIndex = newItems.findIndex(
          (item) =>
            item.productId === selectedProduct.id &&
            item.sizeRange === selection.sizeRange
        );

        const totalPairs = selection.bundles * selection.pairsPerBundle;

        if (existingItemIndex !== -1) {
          // Merge with existing item - add bundles and pairs
          const existingItem = newItems[existingItemIndex];
          const newQuantity = existingItem.quantity + selection.bundles;
          const newTotalPairs = existingItem.totalPairs + totalPairs;
          const discountTotal = newTotalPairs * existingItem.discountPerPair;
          const total = newTotalPairs * existingItem.pricePerPair - discountTotal;

          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            totalPairs: newTotalPairs,
            total: Math.max(0, total),
          };
        } else {
          // Add new item
          const itemId = `${selectedProduct.id}-${selection.sizeRange}-${Date.now()}`;
          const total = totalPairs * selection.pricePerPair;

          newItems.push({
            id: itemId,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            articleNumber: selectedProduct.article_number,
            brandName: selectedProduct.brand_name,
            sizeRange: selection.sizeRange,
            quantity: selection.bundles,
            totalPairs,
            pricePerPair: selection.pricePerPair,
            discountPerPair: 0,
            total,
          });
        }
      });

      return newItems;
    });

    // Reset and auto-focus search
    setSelectedProduct(null);
    setSizeSelections([]);
    setProductOpen(false);
    setProductSearch("");
    
    setTimeout(() => {
      setProductOpen(true);
    }, 100);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      setRemoveItemId(id);
      return;
    }
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const pairsPerBundle = Math.ceil(item.totalPairs / item.quantity);
          const totalPairs = quantity * pairsPerBundle;
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, quantity, totalPairs, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemTotalPairs = (id: string, totalPairs: number) => {
    if (totalPairs < 1) return;
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, totalPairs, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemDiscountPerPair = (id: string, discountPerPair: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const discountTotal = item.totalPairs * discountPerPair;
          const total = item.totalPairs * item.pricePerPair - discountTotal;
          return { ...item, discountPerPair, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const confirmRemoveItem = () => {
    if (removeItemId) {
      setItems(items.filter((item) => item.id !== removeItemId));
      setRemoveItemId(null);
    }
  };

  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.totalPairs * item.pricePerPair,
      0
    );
    const totalDiscount = items.reduce(
      (sum, item) => sum + item.totalPairs * item.discountPerPair,
      0
    );
    const afterDiscount = subtotal - totalDiscount;
    const tax = (afterDiscount * taxPercent) / 100;
    const total = afterDiscount + tax;
    const received = parseFloat(amountReceived) || 0;
    const balance = total - received;
    return { subtotal, totalDiscount, tax, total, received, balance };
  }, [items, taxPercent, amountReceived]);

  const invoiceNumber = useMemo(() => 
    existingInvoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    [existingInvoiceNumber]
  );

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const search = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.article_number.toLowerCase().includes(search) ||
        p.brand_name.toLowerCase().includes(search)
    );
  }, [products, productSearch]);

  const totalSelectedBundles = sizeSelections.reduce((sum, s) => sum + s.bundles, 0);

  // Save invoice (as finalized bill)
  const saveInvoice = async (status: "pending" | "paid" | "draft") => {
    if (!selectedClient) {
      toast({
        title: "Missing Client",
        description: "Please select a client before saving",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No Products",
        description: "Please add at least one product to the invoice",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Determine actual status based on payment
      let finalStatus: string = status;
      if (status !== "draft") {
        if (calculations.balance <= 0) {
          finalStatus = "paid";
        } else if (calculations.received > 0) {
          finalStatus = "partial";
        } else {
          finalStatus = "pending";
        }
      }

      let savedInvoiceId: string;

      if (isEditMode && invoiceId) {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            client_id: selectedClient.id,
            subtotal: calculations.subtotal,
            total_discount: calculations.totalDiscount,
            tax: calculations.tax,
            total: calculations.total,
            amount_received: calculations.received,
            balance_due: calculations.balance,
            status: finalStatus,
            payment_method: paymentMethod,
            account_id: paymentMethod === "account" ? selectedAccount : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (updateError) throw updateError;
        savedInvoiceId = invoiceId;

        // Delete existing items and recreate
        await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      } else {
        // Create new invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            client_id: selectedClient.id,
            subtotal: calculations.subtotal,
            total_discount: calculations.totalDiscount,
            tax: calculations.tax,
            total: calculations.total,
            amount_received: calculations.received,
            balance_due: calculations.balance,
            status: finalStatus,
            payment_method: paymentMethod,
            account_id: paymentMethod === "account" ? selectedAccount : null,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        savedInvoiceId = invoiceData.id;
      }

      // Create invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: savedInvoiceId,
        product_id: item.productId || null,
        product_name: item.productName,
        article_number: item.articleNumber,
        brand_name: item.brandName,
        size_range: item.sizeRange,
        quantity: item.quantity,
        total_pairs: item.totalPairs,
        price_per_pair: item.pricePerPair,
        discount_per_pair: item.discountPerPair,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update client balance (only for finalized invoices, not drafts, and only if not updating)
      if (finalStatus !== "draft" && !isEditMode) {
        const newBalance = selectedClient.current_balance + calculations.balance;
        await supabase
          .from("clients")
          .update({
            current_balance: newBalance,
          })
          .eq("id", selectedClient.id);
      }

      // Log audit event
      await log({
        action: isEditMode ? "update" : (status === "draft" ? "save_draft" : "create"),
        entityType: "invoice",
        entityId: savedInvoiceId,
        details: {
          invoice_number: invoiceNumber,
          client_name: selectedClient.name,
          total: calculations.total,
          status: finalStatus,
          items_count: items.length,
        },
      });

      toast({
        title: "Success",
        description: isEditMode 
          ? `Invoice ${invoiceNumber} updated successfully`
          : (status === "draft" 
            ? "Invoice saved as draft" 
            : `Invoice ${invoiceNumber} created successfully`),
      });

      navigate("/invoices");
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
      setShowDraftConfirm(false);
      setShowReviewDialog(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      log({
        action: "print",
        entityType: "invoice",
        details: {
          invoice_number: invoiceNumber,
          client_name: selectedClient?.name || "No client selected",
          total: calculations.total,
        },
      });
    }
  };

  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; margin-bottom: 5px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .client-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .totals { margin-top: 20px; text-align: right; }
          .totals p { margin: 5px 0; }
          .total-final { font-size: 1.2em; font-weight: bold; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>INVOICE</h1>
            <p><strong>${invoiceNumber}</strong></p>
            <p>Date: ${format(new Date(), "dd MMM yyyy")}</p>
          </div>
        </div>
        
        <div class="client-info">
          <h3>Bill To:</h3>
          <p><strong>${selectedClient?.name || "N/A"}</strong></p>
          <p>${selectedClient?.city || ""}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Article</th>
              <th>Size</th>
              <th>Qty (Bundles)</th>
              <th>Pairs</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.productName}</td>
                <td>${item.articleNumber}</td>
                <td>${item.sizeRange}</td>
                <td>${item.quantity}</td>
                <td>${item.totalPairs}</td>
                <td>Rs ${item.pricePerPair}</td>
                <td>Rs ${item.discountPerPair}</td>
                <td>Rs ${item.total.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: Rs ${calculations.subtotal.toLocaleString()}</p>
          ${calculations.totalDiscount > 0 ? `<p>Discount: - Rs ${calculations.totalDiscount.toLocaleString()}</p>` : ""}
          ${calculations.tax > 0 ? `<p>Tax (${taxPercent}%): Rs ${calculations.tax.toLocaleString()}</p>` : ""}
          <p class="total-final">Total: Rs ${calculations.total.toLocaleString()}</p>
          ${calculations.received > 0 ? `<p>Received: Rs ${calculations.received.toLocaleString()}</p>` : ""}
          ${calculations.balance > 0 ? `<p>Balance Due: Rs ${calculations.balance.toLocaleString()}</p>` : ""}
        </div>

        ${notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong> ${notes}</div>` : ""}
        
        <script>window.print();</script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {isEditMode ? "Edit Invoice" : "New Invoice"}
            </h2>
            <p className="text-muted-foreground text-sm">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 flex-1 sm:flex-none"
            onClick={() => setShowDraftConfirm(true)}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 flex-1 sm:flex-none"
            onClick={handlePrint}
            disabled={items.length === 0}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-2 flex-1 sm:flex-none"
            onClick={() => setShowReviewDialog(true)}
            disabled={saving || items.length === 0 || !selectedClient}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            <span className="hidden sm:inline">Save Bill</span>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Client Selection */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Client Information
            </h3>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  className="w-full justify-between h-auto py-3"
                >
                  {selectedClient ? (
                    <div className="text-left">
                      <p className="font-medium">{selectedClient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedClient.city} • Balance: Rs {selectedClient.current_balance.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a client...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] sm:w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients by name, phone, city..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.name} ${client.phone} ${client.city}`}
                          onSelect={() => {
                            setSelectedClient(client);
                            setClientOpen(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.phone} • {client.city} • Balance: Rs {client.current_balance.toLocaleString()}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Products */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Products
            </h3>

            {/* Items List */}
            {items.length > 0 ? (
              <div className="space-y-3 mb-4">
                {items.map((item) => {
                  const discountTotal = item.totalPairs * item.discountPerPair;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {item.brandName} • {item.articleNumber} • Size {item.sizeRange}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => setRemoveItemId(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <Label className="text-xs text-muted-foreground">Bundles</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(item.id, parseInt(e.target.value) || 0)
                              }
                              className="w-12 h-8 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Total Pairs</Label>
                          <Input
                            type="number"
                            value={item.totalPairs}
                            onChange={(e) =>
                              updateItemTotalPairs(item.id, parseInt(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Disc/Pair (Rs)</Label>
                          <Input
                            type="number"
                            value={item.discountPerPair || ""}
                            onChange={(e) =>
                              updateItemDiscountPerPair(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                            placeholder="0"
                          />
                        </div>
                        <div className="text-right">
                          <Label className="text-xs text-muted-foreground">Total</Label>
                          <p className="font-semibold text-base sm:text-lg mt-1">
                            Rs {item.total.toLocaleString()}
                          </p>
                          {discountTotal > 0 && (
                            <p className="text-xs text-destructive">
                              -Rs {discountTotal.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-border rounded-lg mb-4">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No products added yet. Click "Add Product" below.
                </p>
              </div>
            )}

            {/* Add Product Button - Below items */}
            <Popover open={productOpen} onOpenChange={setProductOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] sm:w-[500px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search products by name or article..."
                    value={productSearch}
                    onValueChange={setProductSearch}
                    ref={searchInputRef}
                  />
                  <CommandList className="max-h-[400px]">
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts
                        .sort((a, b) => a.article_number.localeCompare(b.article_number))
                        .map((product) => (
                          <div key={product.id} className="border-b last:border-b-0">
                            <div
                              className={cn(
                                "px-3 py-2 cursor-pointer transition-colors",
                                selectedProduct?.id === product.id
                                  ? "bg-primary/10"
                                  : "bg-muted/30 hover:bg-muted/50"
                              )}
                              onClick={() => handleProductSelect(product)}
                            >
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.brand_name} • {product.article_number} • Stock:{" "}
                                {product.stock_dozens * product.pairs_per_dozen} pairs
                              </p>
                            </div>

                            {selectedProduct?.id === product.id && (
                              <div className="p-3 space-y-3 bg-background border-t">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Select bundles per size:
                                </p>
                                <div className="space-y-2">
                                  {sizeSelections.map((selection) => (
                                    <div
                                      key={selection.sizeRange}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg border",
                                        selection.bundles > 0
                                          ? "border-primary bg-primary/5"
                                          : "border-border"
                                      )}
                                    >
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">
                                          Size {selection.sizeRange}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          Rs {selection.pricePerPair}/pair •{" "}
                                          {selection.pairsPerBundle}p/bundle
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            updateSizeBundles(
                                              selection.sizeRange,
                                              selection.bundles - 1
                                            )
                                          }
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                        <Input
                                          type="number"
                                          value={selection.bundles}
                                          onChange={(e) =>
                                            updateSizeBundles(
                                              selection.sizeRange,
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                          className="w-12 h-7 text-center text-sm"
                                        />
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            updateSizeBundles(
                                              selection.sizeRange,
                                              selection.bundles + 1
                                            )
                                          }
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {totalSelectedBundles > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={addSelectedSizesToInvoice}
                                    className="w-full gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    Add {totalSelectedBundles} bundle
                                    {totalSelectedBundles > 1 ? "s" : ""} (
                                    {sizeSelections.filter((s) => s.bundles > 0).length} size
                                    {sizeSelections.filter((s) => s.bundles > 0).length > 1
                                      ? "s"
                                      : ""}
                                    )
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this invoice..."
              className="mt-2"
              rows={3}
            />
          </div>
        </motion.div>

        {/* Summary Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Calculations */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Summary
            </h3>

            <div className="space-y-4">
              {/* Tax */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tax Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-center"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs {calculations.subtotal.toLocaleString()}</span>
                </div>
                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Discount</span>
                    <span className="text-destructive">
                      - Rs {calculations.totalDiscount.toLocaleString()}
                    </span>
                  </div>
                )}
                {calculations.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                    <span>Rs {calculations.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">Rs {calculations.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Payment Method</h3>
            <div className="space-y-4">
              <Select
                value={paymentMethod}
                onValueChange={(value: "cash" | "account") => setPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                </SelectContent>
              </Select>

              {paymentMethod === "account" && (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Amount Received (Rs)</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0"
                />
              </div>

              {calculations.balance > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance Due</span>
                    <span className="font-semibold text-destructive">
                      Rs {calculations.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Remove Item Confirmation */}
      <AlertDialog open={!!removeItemId} onOpenChange={() => setRemoveItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this product from the invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Draft Confirmation */}
      <AlertDialog open={showDraftConfirm} onOpenChange={setShowDraftConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save as Draft</AlertDialogTitle>
            <AlertDialogDescription>
              This will save the invoice as a draft. You can edit and finalize it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveInvoice("draft")} disabled={saving}>
              {saving ? "Saving..." : "Save Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bill Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Bill</DialogTitle>
            <DialogDescription>
              Please review the bill details before saving
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Client Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-semibold">{selectedClient?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedClient?.city}</p>
            </div>

            {/* Items Summary */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Items ({items.length})</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                    <span>
                      {idx + 1}. {item.productName} ({item.sizeRange}) - {item.totalPairs} pairs
                    </span>
                    <span className="font-medium">Rs {item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rs {calculations.subtotal.toLocaleString()}</span>
              </div>
              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Discount</span>
                  <span>- Rs {calculations.totalDiscount.toLocaleString()}</span>
                </div>
              )}
              {calculations.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({taxPercent}%)</span>
                  <span>Rs {calculations.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">Rs {calculations.total.toLocaleString()}</span>
              </div>
              {calculations.received > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Amount Received</span>
                  <span>Rs {calculations.received.toLocaleString()}</span>
                </div>
              )}
              {calculations.balance > 0 && (
                <div className="flex justify-between text-sm font-medium text-destructive">
                  <span>Balance Due</span>
                  <span>Rs {calculations.balance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveInvoice("pending")} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Confirm & Save Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewInvoice;
