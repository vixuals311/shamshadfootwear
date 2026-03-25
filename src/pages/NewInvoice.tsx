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
import { useDefaultSizeRanges } from "@/hooks/useDefaultSizeRanges";
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
  available_quantity: number;
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
  availableQuantity: number;
}

const NewInvoice = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const isEditMode = !!invoiceId;
  const { toast } = useToast();
  const { log } = useAuditLog();
  const { sortBySizeRangeOrder } = useDefaultSizeRanges();
  const sortBySizeRangeOrderRef = useRef(sortBySizeRangeOrder);
  sortBySizeRangeOrderRef.current = sortBySizeRangeOrder;
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

  // Credit notes
  const [creditNotes, setCreditNotes] = useState<{ id: string; total_amount: number; return_number: string }[]>([]);
  const totalCreditAvailable = creditNotes.reduce((sum, cn) => sum + cn.total_amount, 0);
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
            product_size_bundles (id, size_range, price_per_pair, pairs_per_bundle, quantity)
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
          size_bundles: sortBySizeRangeOrderRef.current((p.product_size_bundles || [])
            .map((sb: any) => ({ size_range: sb.size_range, price_per_pair: sb.price_per_pair, pairs_per_bundle: sb.pairs_per_bundle, available_quantity: sb.quantity || 0 }))) as any[],
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Fetch credit notes for selected client
  useEffect(() => {
    const fetchCreditNotes = async () => {
      if (!selectedClient) {
        setCreditNotes([]);
        return;
      }
      try {
        const { data } = await supabase
          .from("returns")
          .select("id, total_amount, return_number")
          .eq("client_id", selectedClient.id)
          .eq("adjustment_type", "credit_note");
        setCreditNotes(data || []);
      } catch {
        setCreditNotes([]);
      }
    };
    fetchCreditNotes();
  }, [selectedClient]);


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
          availableQuantity: sb.available_quantity,
        }))
      );
    }
  }, [selectedProduct]);

  const updateSizeBundles = (sizeRange: string, bundles: number) => {
    setSizeSelections((prev) =>
      prev.map((s) => {
        if (s.sizeRange !== sizeRange) return s;
        // Block if out of stock
        const clamped = Math.max(0, Math.min(bundles, s.availableQuantity));
        return { ...s, bundles: clamped };
      })
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

    // Reset and auto-focus search input for quick next product entry
    setSelectedProduct(null);
    setSizeSelections([]);
    setProductSearch("");
    
    // Keep product list open and focus the search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
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

  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState<string | null>(null);

  // Generate sequential invoice number from DB
  useEffect(() => {
    if (existingInvoiceNumber || generatedInvoiceNumber) return;
    const generateSequentialNumber = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;
        const { data } = await supabase
          .from("invoices")
          .select("invoice_number")
          .ilike("invoice_number", `${prefix}%`)
          .order("invoice_number", { ascending: false })
          .limit(1);

        let nextSerial = 1;
        if (data && data.length > 0) {
          const lastNum = data[0].invoice_number;
          const lastSerial = parseInt(lastNum.replace(prefix, ""), 10);
          if (!isNaN(lastSerial)) nextSerial = lastSerial + 1;
        }
        setGeneratedInvoiceNumber(`${prefix}${String(nextSerial).padStart(4, "0")}`);
      } catch {
        setGeneratedInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
      }
    };
    generateSequentialNumber();
  }, [existingInvoiceNumber, generatedInvoiceNumber]);

  const invoiceNumber = existingInvoiceNumber || generatedInvoiceNumber || "Generating...";

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
            total_bundles: items.reduce((sum, i) => sum + i.quantity, 0),
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
            total_bundles: items.reduce((sum, i) => sum + i.quantity, 0),
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

      // Deduct stock from product_size_bundles (only for finalized invoices, not drafts, and only for new invoices)
      if (finalStatus !== "draft" && !isEditMode) {
        for (const item of items) {
          if (item.productId) {
            // Find the matching size bundle and deduct quantity
            const { data: bundle } = await supabase
              .from("product_size_bundles")
              .select("id, quantity, pairs_per_bundle")
              .eq("product_id", item.productId)
              .eq("size_range", item.sizeRange)
              .single();

            if (bundle) {
              const bundlesSold = Math.ceil(item.totalPairs / bundle.pairs_per_bundle);
              const newQty = Math.max(0, bundle.quantity - bundlesSold);

              await supabase
                .from("product_size_bundles")
                .update({ quantity: newQty })
                .eq("id", bundle.id);
            }

            // Also update product stock_dozens for backward compat
            const { data: product } = await supabase
              .from("products")
              .select("stock_dozens, pairs_per_dozen")
              .eq("id", item.productId)
              .single();

            if (product) {
              const currentTotalPairs = product.stock_dozens * product.pairs_per_dozen;
              const newTotalPairs = Math.max(0, currentTotalPairs - item.totalPairs);
              const newDozens = newTotalPairs / product.pairs_per_dozen;

              await supabase
                .from("products")
                .update({ stock_dozens: newDozens })
                .eq("id", item.productId);
            }
          }
        }
      }

      // Apply credit notes and update client balance (only for finalized invoices, not drafts, and only if not updating)
      if (finalStatus !== "draft" && !isEditMode) {
        let creditApplied = 0;
        let remainingBalance = calculations.balance;

        // Apply available credit notes
        if (creditNotes.length > 0 && remainingBalance > 0) {
          for (const cn of creditNotes) {
            if (remainingBalance <= 0) break;
            const applyAmount = Math.min(cn.total_amount, remainingBalance);
            creditApplied += applyAmount;
            remainingBalance -= applyAmount;

            // Update the return record: reduce or zero out the credit note
            const newCreditAmount = cn.total_amount - applyAmount;
            if (newCreditAmount <= 0) {
              // Change adjustment_type to mark as used
              await supabase
                .from("returns")
                .update({ adjustment_type: "credit_applied", total_amount: 0 })
                .eq("id", cn.id);
            } else {
              await supabase
                .from("returns")
                .update({ total_amount: newCreditAmount })
                .eq("id", cn.id);
            }
          }

          // Update the invoice with the adjusted balance and credit applied
          await supabase
            .from("invoices")
            .update({
              credit_applied: creditApplied,
              amount_received: calculations.received + creditApplied,
              balance_due: remainingBalance,
              status: remainingBalance <= 0 ? "paid" : (calculations.received + creditApplied > 0 ? "partial" : "pending"),
            })
            .eq("id", savedInvoiceId);
        }

        const newBalance = selectedClient.current_balance + remainingBalance;
        await supabase
          .from("clients")
          .update({
            current_balance: newBalance,
          })
          .eq("id", selectedClient.id);

        if (creditApplied > 0) {
          toast({
            title: "Credit Applied",
            description: `Rs ${creditApplied.toLocaleString()} credit note applied to this invoice`,
          });
        }
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
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-28 sm:pb-20">
      {/* Header - Compact on mobile */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              {isEditMode ? "Edit Invoice" : "New Invoice"}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="icon"
            className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 sm:gap-2"
            onClick={() => setShowDraftConfirm(true)}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Draft</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 sm:gap-2"
            onClick={handlePrint}
            disabled={items.length === 0}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </motion.div>

      {/* Client Selection - Compact */}
      <div className="bg-card rounded-xl p-3 sm:p-6 shadow-card">
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clientOpen}
              className="w-full justify-between h-auto py-2.5 sm:py-3"
            >
              {selectedClient ? (
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate flex items-center gap-2">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    {selectedClient.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground ml-6">
                    {selectedClient.city} • Bal: Rs {selectedClient.current_balance.toLocaleString()}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Select a client...
                </span>
              )}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
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
                        <p className="text-xs text-muted-foreground">
                          {client.phone} • {client.city} • Bal: Rs {client.current_balance.toLocaleString()}
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 sm:gap-6">
        {/* Main Form */}
        <div className="space-y-4 sm:space-y-6">
          {/* Product Search - Sticky on mobile */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:backdrop-blur-none">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  if (e.target.value.length > 0 && !productOpen) {
                    setProductOpen(true);
                  }
                }}
                onFocus={() => setProductOpen(true)}
                className="pl-9 h-11 sm:h-10 text-base sm:text-sm"
                ref={searchInputRef}
              />
              {productOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => { setProductOpen(false); setProductSearch(""); setSelectedProduct(null); }}
                >
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Product Selection Dropdown */}
          {productOpen && (
            <div className="border rounded-lg max-h-[60vh] sm:max-h-[500px] overflow-y-auto bg-card shadow-lg">
              {filteredProducts.length > 0 ? (
                filteredProducts
                  .sort((a, b) => a.article_number.localeCompare(b.article_number))
                  .map((product) => (
                    <div key={product.id} className="border-b last:border-b-0">
                      <div
                        className={cn(
                          "px-3 py-3 sm:py-2 cursor-pointer transition-colors active:bg-primary/20",
                          selectedProduct?.id === product.id
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.article_number} • {product.brand_name}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {product.size_bundles.reduce((sum, sb) => sum + sb.available_quantity * sb.pairs_per_bundle, 0)}p
                          </span>
                        </div>
                      </div>

                      {selectedProduct?.id === product.id && (
                        <div className="p-3 space-y-3 bg-muted/20 border-t">
                          <p className="text-xs font-medium text-muted-foreground">
                            Select bundles per size:
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {sizeSelections.map((selection) => (
                              <div
                                key={selection.sizeRange}
                                className={cn(
                                  "flex flex-col gap-1 p-2 rounded-lg border bg-card transition-colors",
                                  selection.bundles > 0 && selection.bundles <= selection.availableQuantity && "border-primary/50 bg-primary/5",
                                  selection.bundles > 0 && selection.bundles > selection.availableQuantity && "border-warning/50 bg-warning/5",
                                  selection.availableQuantity === 0 && selection.bundles === 0 && "opacity-60"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold">
                                    {selection.sizeRange}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Rs {selection.pricePerPair}
                                  </span>
                                </div>
                                {selection.availableQuantity === 0 ? (
                                  <span className="text-[10px] text-destructive font-medium">Out of stock</span>
                                ) : selection.bundles > selection.availableQuantity ? (
                                  <span className="text-[10px] text-warning font-medium">{selection.availableQuantity} avail</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">{selection.availableQuantity} avail</span>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 sm:h-6 sm:w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSizeBundles(
                                        selection.sizeRange,
                                        selection.bundles - 1
                                      );
                                    }}
                                  >
                                    <Minus className="h-3 w-3" />
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
                                    className="w-10 h-8 sm:h-6 text-center text-sm sm:text-xs p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 sm:h-6 sm:w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSizeBundles(
                                        selection.sizeRange,
                                        selection.bundles + 1
                                      );
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {totalSelectedBundles > 0 && (
                            <div className="sticky bottom-0 bg-card pt-2 pb-1 -mx-3 px-3 border-t border-border/30">
                              <Button
                                className="w-full h-11 sm:h-9 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSelectedSizesToInvoice();
                                }}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Add {totalSelectedBundles} bundle{totalSelectedBundles > 1 ? 's' : ''}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No products found
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          {items.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Items ({items.length})
                </h3>
                <span className="text-xs font-semibold text-foreground">
                  {items.reduce((sum, i) => sum + i.quantity, 0)} bundles • {items.reduce((sum, i) => sum + i.totalPairs, 0)} pairs
                </span>
              </div>
              <div className="bg-card rounded-lg border border-border/50 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Product</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Article</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Size</th>
                      <th className="text-center py-2 px-1 text-xs font-medium text-muted-foreground">Bdl</th>
                      <th className="text-center py-2 px-1 text-xs font-medium text-muted-foreground">Prs</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Rate</th>
                      <th className="text-center py-2 px-1 text-xs font-medium text-muted-foreground">Disc</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="py-1.5 px-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-1.5 px-2">
                          <span className="font-medium text-foreground truncate block max-w-[120px] sm:max-w-[180px]">{item.productName}</span>
                          <span className="text-[10px] text-muted-foreground sm:hidden">{item.articleNumber}</span>
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground hidden sm:table-cell">{item.articleNumber}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{item.sizeRange}</td>
                        <td className="py-1.5 px-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, item.quantity - 1)}>-</Button>
                            <Input type="number" value={item.quantity} onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)} className="w-9 h-6 text-center text-xs p-0" />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, item.quantity + 1)}>+</Button>
                          </div>
                        </td>
                        <td className="py-1.5 px-1">
                          <Input type="number" value={item.totalPairs} onChange={(e) => updateItemTotalPairs(item.id, parseInt(e.target.value) || 0)} className="w-14 h-6 text-center text-xs p-0" />
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground hidden sm:table-cell">Rs {item.pricePerPair}</td>
                        <td className="py-1.5 px-1">
                          <Input type="number" value={item.discountPerPair || ""} onChange={(e) => updateItemDiscountPerPair(item.id, parseFloat(e.target.value) || 0)} className="w-14 h-6 text-center text-xs p-0" placeholder="0" />
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-foreground whitespace-nowrap">Rs {item.total.toLocaleString()}</td>
                        <td className="py-1.5 px-1">
                          <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive h-6 w-6" onClick={() => setRemoveItemId(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            !productOpen && (
              <div className="py-6 text-center border-2 border-dashed border-border rounded-lg">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Search above to add products
                </p>
              </div>
            )
          )}

          {/* Notes - collapsible on mobile */}
          <details className="bg-card rounded-xl shadow-card group">
            <summary className="p-3 sm:p-4 cursor-pointer text-sm font-medium text-muted-foreground flex items-center justify-between list-none">
              <span>Notes (Optional)</span>
              <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-3 pb-3 sm:px-4 sm:pb-4">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </details>
        </div>

        {/* Summary Sidebar - visible on desktop, hidden on mobile (floating bar replaces it) */}
        <div className="hidden lg:block space-y-6">
          {/* Calculations */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Summary
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                />
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

              {/* Credit Notes Info */}
              {creditNotes.length > 0 && (
                <div className="p-3 rounded-lg bg-accent/50 border border-accent">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Available Credit Notes</span>
                    <span className="font-semibold text-primary">
                      Rs {totalCreditAvailable.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Will be auto-applied on save
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save Bill Button - Desktop */}
          <Button
            className="w-full h-12 text-sm font-semibold gap-2"
            onClick={() => setShowReviewDialog(true)}
            disabled={saving || items.length === 0 || !selectedClient}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Save Bill
          </Button>
        </div>

        {/* Mobile Payment & Summary section - shown only on mobile */}
        <div className="lg:hidden space-y-4">
          <div className="bg-card rounded-xl p-3 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={paymentMethod}
                  onValueChange={(value: "cash" | "account") => setPaymentMethod(value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Received (Rs)"
                  className="h-10"
                />
              </div>
              {paymentMethod === "account" && (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-10">
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
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 text-center text-sm"
                />
              </div>
              {/* Credit Notes - Mobile */}
              {creditNotes.length > 0 && (
                <div className="p-2.5 rounded-lg bg-accent/50 border border-accent">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Credit Notes</span>
                    <span className="text-xs font-semibold text-primary">
                      Rs {totalCreditAvailable.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Auto-applied on save</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{items.length} items • {items.reduce((s, i) => s + i.totalPairs, 0)} pairs</p>
            <p className="text-lg font-bold text-primary">Rs {calculations.total.toLocaleString()}</p>
            {calculations.balance > 0 && (
              <p className="text-[10px] text-destructive">Due: Rs {calculations.balance.toLocaleString()}</p>
            )}
          </div>
          <Button
            className="h-12 px-6 text-sm font-semibold gap-2"
            onClick={() => setShowReviewDialog(true)}
            disabled={saving || items.length === 0 || !selectedClient}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Save Bill
          </Button>
        </div>
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

            {/* Items Summary Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Items ({items.length})</p>
                <p className="text-sm font-semibold">{items.reduce((sum, i) => sum + i.quantity, 0)} bundles • {items.reduce((sum, i) => sum + i.totalPairs, 0)} pairs</p>
              </div>
              <div className="max-h-48 overflow-y-auto overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-1.5 px-2">#</th>
                      <th className="text-left py-1.5 px-2">Product</th>
                      <th className="text-left py-1.5 px-2">Size</th>
                      <th className="text-right py-1.5 px-2">Bdl</th>
                      <th className="text-right py-1.5 px-2">Prs</th>
                      <th className="text-right py-1.5 px-2">Rate</th>
                      <th className="text-right py-1.5 px-2">Disc</th>
                      <th className="text-right py-1.5 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-1 px-2">{idx + 1}</td>
                        <td className="py-1 px-2 font-medium">{item.productName}<br/><span className="text-muted-foreground">{item.articleNumber}</span></td>
                        <td className="py-1 px-2">{item.sizeRange}</td>
                        <td className="py-1 px-2 text-right">{item.quantity}</td>
                        <td className="py-1 px-2 text-right">{item.totalPairs}</td>
                        <td className="py-1 px-2 text-right">Rs {item.pricePerPair}</td>
                        <td className="py-1 px-2 text-right">{item.discountPerPair > 0 ? `Rs ${item.discountPerPair}` : '-'}</td>
                        <td className="py-1 px-2 text-right font-semibold">Rs {item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              {/* Credit Note Info in Review */}
              {creditNotes.length > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Credit Note Applied</span>
                  <span>- Rs {Math.min(totalCreditAvailable, Math.max(0, calculations.balance)).toLocaleString()}</span>
                </div>
              )}
              {calculations.balance > 0 && (
                <div className="flex justify-between text-sm font-medium text-destructive">
                  <span>Balance Due</span>
                  <span>Rs {Math.max(0, calculations.balance - (creditNotes.length > 0 ? Math.min(totalCreditAvailable, calculations.balance) : 0)).toLocaleString()}</span>
                </div>
              )}
              {creditNotes.length > 0 && calculations.balance > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Credit memo of Rs {totalCreditAvailable.toLocaleString()} will be auto-applied
                </p>
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
