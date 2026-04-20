import { useState, useEffect, useMemo } from "react";
import { generateBrandedPrintPage, openPrintWindow, type PaperSize } from "@/utils/printUtils";
import { getPrintDefault } from "@/utils/printPreferences";
import { PrintButton } from "@/components/common/PrintButton";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Edit2,
  Trash2,
  Grid3X3,
  List,
  ArrowLeft,
  FileText,
  CreditCard,
  Calendar,
  Eye,
  Printer,
  Download as DownloadIcon,
  Loader2,
  AlertTriangle,
  Key,
  ClipboardList,
  X,
  SortAsc,
} from "lucide-react";
import { CityCombobox } from "@/components/clients/CityCombobox";
import { ReferenceCombobox } from "@/components/clients/ReferenceCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { offlineMutation } from "@/hooks/useOfflineSync";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { exportToCSV } from "@/utils/exportUtils";
import { InvoiceViewDialog } from "@/components/dashboard/InvoiceViewDialog";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  referenceNumber: string;
  openingBalance: number;
  currentBalance: number;
  totalSpent: number;
  invoiceCount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  total: number;
  subtotal: number;
  totalDiscount: number;
  amountReceived: number;
  balanceDue: number;
  status: string;
  paymentMethod: string;
  accountName: string;
  items: any[];
}

interface RecoveryRecord {
  id: string;
  date: Date;
  amount: number;
  notes: string | null;
  isFromCity: boolean;
}

interface ManualBill {
  id: string;
  bill_number: string;
  amount: number;
  date: string;
  notes: string | null;
  status: "paid" | "unpaid";
  created_at: string;
}

const Clients = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterBalance, setFilterBalance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const [loadingInvoiceView, setLoadingInvoiceView] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [showAddClientConfirm, setShowAddClientConfirm] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [clientRecoveries, setClientRecoveries] = useState<RecoveryRecord[]>([]);
  const [clientManualBills, setClientManualBills] = useState<ManualBill[]>([]);
  const [pinDialogClient, setPinDialogClient] = useState<Client | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentClientPin, setCurrentClientPin] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Edit client states
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", referenceNumber: "",
  });
  const [editClientSaving, setEditClientSaving] = useState(false);

  // Manual bill states
  const [isAddManualBillOpen, setIsAddManualBillOpen] = useState(false);
  const [manualBillForm, setManualBillForm] = useState({
    bill_number: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [manualBillSaving, setManualBillSaving] = useState(false);
  const [showManualBillConfirm, setShowManualBillConfirm] = useState(false);
  
  // Quick recovery states
  const [isQuickRecoveryOpen, setIsQuickRecoveryOpen] = useState(false);
  const [quickRecoveryAmount, setQuickRecoveryAmount] = useState("");
  const [quickRecoveryNotes, setQuickRecoveryNotes] = useState("");
  const [quickRecoveryLoading, setQuickRecoveryLoading] = useState(false);
  const [showQuickRecoveryConfirm, setShowQuickRecoveryConfirm] = useState(false);
  const [recoveryType, setRecoveryType] = useState<"individual" | "city">("individual");
  const [quickRecoveryAccountId, setQuickRecoveryAccountId] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<{ id: string; name: string }[]>([]);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    openingBalance: "",
    notes: "",
    referenceNumber: "",
  });

  // Fetch clients from Supabase
  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;

      const formattedClients: Client[] = (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || "N/A",
        phone: c.phone || "N/A",
        address: c.address || "N/A",
        city: c.city || "N/A",
        referenceNumber: c.reference_number || "N/A",
        openingBalance: c.opening_balance || 0,
        currentBalance: c.current_balance || 0,
        totalSpent: c.total_spent || 0,
        invoiceCount: c.invoice_count || 0,
      }));

      setClients(formattedClients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentAccounts = async () => {
    const { data } = await supabase.from("payment_accounts").select("*").order("name");
    setPaymentAccounts((data || []).map(a => ({ id: a.id, name: a.name })));
  };

  useEffect(() => {
    fetchClients();
    fetchPaymentAccounts();
  }, []);

  // Auto-select client from URL query param
  useEffect(() => {
    const selectedId = searchParams.get("selected");
    if (selectedId && clients.length > 0 && !selectedClient) {
      const client = clients.find((c) => c.id === selectedId);
      if (client) {
        setSelectedClient(client);
        // Clear the query param
        setSearchParams({}, { replace: true });
      }
    }
  }, [clients, searchParams]);

  // Fetch client details when selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientDetails(selectedClient.id);
    }
  }, [selectedClient?.id]);

  const fetchClientDetails = async (clientId: string) => {
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, created_at, total, subtotal, total_discount, status,
          amount_received, balance_due, payment_method, account_id,
          invoice_items (*),
          payment_accounts (name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      const formattedInvoices: Invoice[] = (invoicesData || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        createdAt: new Date(inv.created_at),
        total: inv.total,
        subtotal: inv.subtotal,
        totalDiscount: inv.total_discount,
        amountReceived: inv.amount_received || 0,
        balanceDue: inv.balance_due || 0,
        status: inv.status,
        paymentMethod: inv.payment_method || "cash",
        accountName: inv.payment_accounts?.name || "",
        items: (inv.invoice_items || []).map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          articleNumber: item.article_number,
          sizeRange: item.size_range,
          totalPairs: item.total_pairs,
          pricePerPair: item.price_per_pair,
          discountPerPair: item.discount_per_pair,
          total: item.total,
        })),
      }));

      setClientInvoices(formattedInvoices);

      // Fetch direct recoveries
      const { data: directRecoveries, error: directRecoveriesError } = await supabase
        .from("recoveries")
        .select("*")
        .eq("client_id", clientId)
        .eq("type", "client")
        .order("date", { ascending: false });

      if (directRecoveriesError) throw directRecoveriesError;

      // Fetch city recoveries that include this client
      const { data: cityRecoveryAmounts, error: cityRecoveryError } = await supabase
        .from("recovery_client_amounts")
        .select(`
          amount,
          recoveries (id, date, notes, city)
        `)
        .eq("client_id", clientId);

      if (cityRecoveryError) throw cityRecoveryError;

      const formattedRecoveries: RecoveryRecord[] = [
        ...(directRecoveries || []).map((r) => ({
          id: r.id,
          date: new Date(r.date),
          amount: r.amount,
          notes: r.notes,
          isFromCity: false,
        })),
        ...(cityRecoveryAmounts || []).map((rca: any) => ({
          id: rca.recoveries?.id || "",
          date: new Date(rca.recoveries?.date || new Date()),
          amount: rca.amount,
          notes: `City: ${rca.recoveries?.city || "Unknown"}`,
          isFromCity: true,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      setClientRecoveries(formattedRecoveries);

      // Fetch manual bills
      const { data: manualBillsData, error: manualBillsError } = await supabase
        .from("manual_bills")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      if (manualBillsError) throw manualBillsError;
      setClientManualBills((manualBillsData || []) as ManualBill[]);
    } catch (error: any) {
      console.error("Error fetching client details:", error);
    }
  };

  // View invoice with full details (same as Invoices page)
  const handleViewClientInvoice = async (invoiceId: string) => {
    try {
      setLoadingInvoiceView(true);

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, created_at, subtotal, total_discount, tax, total,
          amount_received, balance_due, total_bundles, credit_applied, status,
          payment_method, account_id,
          clients (name, city),
          invoice_items (id, product_name, article_number, size_range, quantity, total_pairs, price_per_pair, discount_per_pair, total),
          payment_accounts (name)
        `)
        .eq("id", invoiceId)
        .single();

      if (error) throw error;

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
        client_name: (data.clients as any)?.name || selectedClient?.name || "Unknown",
        client_city: (data.clients as any)?.city || selectedClient?.city || "",
        subtotal: data.subtotal,
        total_discount: data.total_discount,
        tax: data.tax,
        total: data.total,
        amount_received: data.amount_received,
        balance_due: data.balance_due,
        total_bundles: data.total_bundles || 0,
        credit_applied: data.credit_applied || 0,
        status: data.status,
        payment_method: data.payment_method || "cash",
        account_name: (data as any).payment_accounts?.name || "",
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

      setViewInvoiceDialogOpen(true);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoadingInvoiceView(false);
    }
  };

  const existingCities = useMemo(() => {
    const cities = clients.map((c) => c.city).filter((city) => city && city !== "N/A");
    return [...new Set(cities)].sort();
  }, [clients]);

  const existingReferences = useMemo(() => {
    const refs = clients.map((c) => c.referenceNumber).filter((r) => r && r !== "N/A");
    return [...new Set(refs)].sort();
  }, [clients]);

  const uniqueCities = existingCities;

  const activeFilterCount = [filterCity !== "all", filterBalance !== "all", sortBy !== "name"].filter(Boolean).length;

  // Filter clients including phone number search + filters
  const filteredClients = useMemo(() => {
    let result = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
    );

    if (filterCity !== "all") {
      result = result.filter((c) => c.city === filterCity);
    }

    if (filterBalance === "positive") {
      result = result.filter((c) => c.currentBalance > 0);
    } else if (filterBalance === "zero") {
      result = result.filter((c) => c.currentBalance === 0);
    } else if (filterBalance === "negative") {
      result = result.filter((c) => c.currentBalance < 0);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "balance_high": return b.currentBalance - a.currentBalance;
        case "balance_low": return a.currentBalance - b.currentBalance;
        case "recent": return b.name.localeCompare(a.name); // reverse alphabetical as proxy
        case "invoices": return b.invoiceCount - a.invoiceCount;
        default: return 0;
      }
    });

    return result;
  }, [clients, searchQuery, filterCity, filterBalance, sortBy]);

  const checkDuplicateClient = () => {
    // Only check for duplicate phone numbers, not names
    const duplicate = clients.find(
      (c) => newClient.phone && c.phone === newClient.phone
    );

    if (duplicate) {
      setDuplicateWarning(`A client with phone number "${newClient.phone}" already exists (${duplicate.name}).`);
      return true;
    }
    setDuplicateWarning(null);
    return false;
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone || !newClient.city || !newClient.address || !newClient.referenceNumber) {
      toast({
        title: "Missing Information",
        description: "Name, phone, city, address, and reference number are required",
        variant: "destructive",
      });
      return;
    }

    const phonePattern = /^0\d{3}-\d{7}$/;
    if (!phonePattern.test(newClient.phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone must follow the pattern 0XXX-XXXXXXX (e.g. 0306-1728311)",
        variant: "destructive",
      });
      return;
    }

    try {
      const openingBalance = parseFloat(newClient.openingBalance) || 0;
      
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: newClient.name,
          email: newClient.email || null,
          phone: newClient.phone,
          address: newClient.address || null,
          city: newClient.city || null,
          opening_balance: openingBalance,
          current_balance: openingBalance,
          reference_number: newClient.referenceNumber || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await log({
        action: "create",
        entityType: "client",
        entityId: data.id,
        details: {
          name: newClient.name,
          phone: newClient.phone,
          city: newClient.city,
          opening_balance: openingBalance,
        },
      });

      toast({
        title: "Success",
        description: "Client added successfully",
      });

      setNewClient({ name: "", email: "", phone: "", address: "", city: "", openingBalance: "", notes: "", referenceNumber: "" });
      setDuplicateWarning(null);
      setShowAddClientConfirm(false);
      setIsAddDialogOpen(false);
      setSearchQuery(""); // Clear search to show all clients
      fetchClients();
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClientId) return;

    try {
      // Get client info for logging
      const clientToDelete = clients.find(c => c.id === deleteClientId);
      
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deleteClientId);

      if (error) throw error;

      // Log audit event
      await log({
        action: "delete",
        entityType: "client",
        entityId: deleteClientId,
        details: {
          name: clientToDelete?.name,
          phone: clientToDelete?.phone,
        },
      });

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });

      setDeleteClientId(null);
      fetchClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  // Open edit client dialog
  const handleOpenEditClient = (client: Client) => {
    setEditClientData(client);
    setEditClientForm({
      name: client.name,
      email: client.email === "N/A" ? "" : client.email,
      phone: client.phone === "N/A" ? "" : client.phone,
      address: client.address === "N/A" ? "" : client.address,
      city: client.city === "N/A" ? "" : client.city,
      referenceNumber: client.referenceNumber === "N/A" ? "" : client.referenceNumber,
    });
    setEditClientDialogOpen(true);
  };

  // Save edited client
  const handleSaveEditClient = async () => {
    if (!editClientData) return;
    if (!editClientForm.name || !editClientForm.phone) {
      toast({ title: "Missing Info", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    const phonePattern = /^0\d{3}-\d{7}$/;
    if (!phonePattern.test(editClientForm.phone)) {
      toast({ title: "Invalid Phone", description: "Phone must follow 0XXX-XXXXXXX", variant: "destructive" });
      return;
    }
    setEditClientSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: editClientForm.name,
          email: editClientForm.email || null,
          phone: editClientForm.phone,
          address: editClientForm.address || null,
          city: editClientForm.city || null,
          reference_number: editClientForm.referenceNumber || null,
        })
        .eq("id", editClientData.id);
      if (error) throw error;
      await log({
        action: "update",
        entityType: "client",
        entityId: editClientData.id,
        details: { name: editClientForm.name, phone: editClientForm.phone },
      });
      toast({ title: "Success", description: "Client updated successfully" });
      setEditClientDialogOpen(false);
      setEditClientData(null);
      // Update selectedClient if viewing
      if (selectedClient?.id === editClientData.id) {
        setSelectedClient({
          ...selectedClient,
          name: editClientForm.name,
          email: editClientForm.email || "N/A",
          phone: editClientForm.phone || "N/A",
          address: editClientForm.address || "N/A",
          city: editClientForm.city || "N/A",
          referenceNumber: editClientForm.referenceNumber || "N/A",
        });
      }
      fetchClients();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update client", variant: "destructive" });
    } finally {
      setEditClientSaving(false);
    }
  };

  // Handle opening PIN dialog
  const handleOpenPinDialog = async (client: Client) => {
    setPinDialogClient(client);
    setNewPin("");
    setConfirmPin("");
    setPinLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("portal_pin")
        .eq("id", client.id)
        .single();
      
      if (error) throw error;
      setCurrentClientPin(data?.portal_pin || null);
    } catch (error) {
      console.error("Error fetching client PIN:", error);
      setCurrentClientPin(null);
    } finally {
      setPinLoading(false);
    }
  };

  // Handle PIN save/update
  const handleSavePin = async () => {
    if (!pinDialogClient) return;
    
    if (!newPin || newPin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be at least 4 digits",
        variant: "destructive",
      });
      return;
    }
    
    if (newPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("clients")
        .update({ portal_pin: newPin })
        .eq("id", pinDialogClient.id);
      
      if (error) throw error;
      
      // Log audit event
      await log({
        action: "update",
        entityType: "client",
        entityId: pinDialogClient.id,
        details: {
          name: pinDialogClient.name,
          action: currentClientPin ? "PIN changed" : "PIN set",
        },
      });
      
      toast({
        title: "Success",
        description: currentClientPin ? "Client PIN updated successfully" : "Client PIN set successfully",
      });
      
      setPinDialogClient(null);
      setNewPin("");
      setConfirmPin("");
      setCurrentClientPin(null);
    } catch (error: any) {
      console.error("Error saving PIN:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save PIN",
        variant: "destructive",
      });
    }
  };

  // Handle PIN removal
  const handleRemovePin = async () => {
    if (!pinDialogClient) return;
    
    try {
      const { error } = await supabase
        .from("clients")
        .update({ portal_pin: null })
        .eq("id", pinDialogClient.id);
      
      if (error) throw error;
      
      // Log audit event
      await log({
        action: "update",
        entityType: "client",
        entityId: pinDialogClient.id,
        details: {
          name: pinDialogClient.name,
          action: "PIN removed",
        },
      });
      
      toast({
        title: "Success",
        description: "Client PIN removed successfully",
      });
      
      setPinDialogClient(null);
      setNewPin("");
      setConfirmPin("");
      setCurrentClientPin(null);
    } catch (error: any) {
      console.error("Error removing PIN:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove PIN",
        variant: "destructive",
      });
    }
  };

  const generatePrintContent = (type: "bills" | "recoveries", clientName: string, data: any[], balanceMap?: Map<string, number>, paperSize: PaperSize = "A4") => {
    const title = type === "bills" ? "Bills History" : "Recoveries History";
    
    let tableHtml = "";
    let totalsHtml = "";
    if (type === "bills") {
      const totalAmount = data.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const totalPaid = data.reduce((sum: number, inv: any) => sum + (inv.amountReceived || 0), 0);
      const totalDue = data.reduce((sum: number, inv: any) => sum + (inv.balanceDue || 0), 0);
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date & Time</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Via</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((invoice: Invoice) => `
              <tr>
                <td>${invoice.invoiceNumber}</td>
                <td>${format(invoice.createdAt, "dd MMM yy, hh:mm a")}</td>
                <td>Rs ${invoice.total.toLocaleString()}</td>
                <td class="paid-col">Rs ${(invoice.amountReceived || 0).toLocaleString()}</td>
                <td class="${invoice.balanceDue > 0 ? 'due-col' : ''}">${invoice.balanceDue > 0 ? 'Rs ' + invoice.balanceDue.toLocaleString() : '-'}</td>
                <td>${invoice.paymentMethod === "account" ? invoice.accountName || "Account" : "Cash"}</td>
                <td class="due-col">Rs ${(balanceMap?.get(invoice.id) || 0).toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr class="totals-row"><td colspan="2" style="text-align:right">Total:</td><td>Rs ${totalAmount.toLocaleString()}</td><td class="paid-col">Rs ${totalPaid.toLocaleString()}</td><td class="due-col">Rs ${totalDue.toLocaleString()}</td><td colspan="2"></td></tr>
          </tbody>
        </table>
      `;
    } else {
      const totalAmount = data.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((recovery: RecoveryRecord) => `
              <tr>
                <td>${format(recovery.date, "dd MMM yyyy")}</td>
                <td>Rs ${recovery.amount.toLocaleString()}</td>
                <td>${recovery.isFromCity ? "City Recovery" : "Individual"}</td>
                <td class="due-col">Rs ${(balanceMap?.get(recovery.id + '-' + recovery.date.getTime()) || 0).toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr class="totals-row"><td style="text-align:right">Total:</td><td>Rs ${totalAmount.toLocaleString()}</td><td colspan="2"></td></tr>
          </tbody>
        </table>
      `;
    }

    return generateBrandedPrintPage({ title, subtitle: clientName, tableHtml, totalsHtml, paperSize });
  };

  const handlePrint = (
    type: "bills" | "recoveries",
    invoiceBalMap?: Map<string, number>,
    recoveryBalMap?: Map<string, number>,
    paperSize: PaperSize = getPrintDefault("clientHistory"),
  ) => {
    if (!selectedClient) return;
    const data = type === "bills" ? clientInvoices : clientRecoveries;
    const balMap = type === "bills" ? invoiceBalMap : recoveryBalMap;
    const content = generatePrintContent(type, selectedClient.name, data, balMap, paperSize);
    openPrintWindow(content);
  };

  // Export clients to CSV
  const handleExportClients = () => {
    exportToCSV(
      filteredClients,
      [
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "city", header: "City" },
        { key: "address", header: "Address" },
        { 
          key: "openingBalance", 
          header: "Opening Balance", 
          format: (val: number) => `Rs ${val.toLocaleString()}` 
        },
        { 
          key: "currentBalance", 
          header: "Current Balance", 
          format: (val: number) => `Rs ${val.toLocaleString()}` 
        },
        { 
          key: "totalSpent", 
          header: "Total Spent", 
          format: (val: number) => `Rs ${val.toLocaleString()}` 
        },
        { key: "invoiceCount", header: "Invoice Count" },
      ],
      "clients"
    );
    
    log({
      action: "export",
      entityType: "client",
      details: { count: filteredClients.length, type: "csv" },
    });
    
    toast({ title: "Success", description: "Clients exported successfully" });
  };

  // Quick Recovery for selected client
  const handleQuickRecovery = async () => {
    if (!selectedClient || !quickRecoveryAmount) return;
    
    setQuickRecoveryLoading(true);
    try {
      const amount = parseFloat(quickRecoveryAmount);
      const newBalance = selectedClient.currentBalance - amount;

      if (recoveryType === "city") {
        // City recovery: create a city recovery record and add client amount
        const clientCity = selectedClient.city !== "N/A" ? selectedClient.city : null;
        
        // Check if there's already a city recovery for today
        const today = new Date().toISOString().split("T")[0];
        const { data: existingRecovery } = await supabase
          .from("recoveries")
          .select("id, amount")
          .eq("type", "city")
          .eq("city", clientCity || "")
          .eq("date", today)
          .maybeSingle();

        let recoveryId: string;

        if (existingRecovery) {
          // Add to existing city recovery
          recoveryId = existingRecovery.id;
          await supabase
            .from("recoveries")
            .update({ amount: existingRecovery.amount + amount })
            .eq("id", recoveryId);
        } else {
          // Create new city recovery
          const { data: newRecovery, error: recError } = await supabase
            .from("recoveries")
            .insert({
              amount,
              type: "city",
              city: clientCity,
              notes: quickRecoveryNotes || null,
              date: today,
            })
            .select()
            .single();
          if (recError) throw recError;
          recoveryId = newRecovery.id;
        }

        // Add client amount entry
        const rcaData: any = {
          recovery_id: recoveryId,
          client_id: selectedClient.id,
          amount,
        };
        if (quickRecoveryAccountId) rcaData.account_id = quickRecoveryAccountId;
        const { error: rcaError } = await supabase
          .from("recovery_client_amounts")
          .insert(rcaData);
        if (rcaError) throw rcaError;

        // Update client balance
        await supabase
          .from("clients")
          .update({ current_balance: newBalance })
          .eq("id", selectedClient.id);
      } else {
        // Individual recovery (existing flow)
        const insertData: any = {
          client_id: selectedClient.id,
          amount: amount,
          notes: quickRecoveryNotes || null,
          type: "client",
        };
        if (quickRecoveryAccountId) insertData.account_id = quickRecoveryAccountId;
        const recoveryResult = await offlineMutation("recoveries", "insert", insertData);
        if (recoveryResult.error) throw new Error(recoveryResult.error);

        const balanceResult = await offlineMutation("clients", "update", {
          current_balance: newBalance,
        }, selectedClient.id);
        if (balanceResult.error) throw new Error(balanceResult.error);
      }

      log({
        action: "create",
        entityType: "recovery",
        entityId: selectedClient.id,
        details: {
          clientName: selectedClient.name,
          amount,
          type: recoveryType,
          notes: quickRecoveryNotes,
        },
      }).catch(() => {});

      toast({
        title: "Success",
        description: `${recoveryType === "city" ? "City" : "Individual"} recovery of Rs ${amount.toLocaleString()} added for ${selectedClient.name}`,
      });

      setSelectedClient({ ...selectedClient, currentBalance: newBalance });
      fetchClientDetails(selectedClient.id);
      fetchClients();
      
      setQuickRecoveryAmount("");
      setQuickRecoveryNotes("");
      setQuickRecoveryAccountId("");
      setRecoveryType("individual");
      setShowQuickRecoveryConfirm(false);
      setIsQuickRecoveryOpen(false);
    } catch (error: any) {
      console.error("Error adding recovery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add recovery",
        variant: "destructive",
      });
    } finally {
      setQuickRecoveryLoading(false);
    }
  };

  // Add manual bill
  const handleAddManualBill = async () => {
    if (!selectedClient || !manualBillForm.bill_number || !manualBillForm.amount) return;
    setManualBillSaving(true);
    try {
      const amount = parseFloat(manualBillForm.amount);
      const { error } = await supabase.from("manual_bills").insert({
        client_id: selectedClient.id,
        bill_number: manualBillForm.bill_number,
        amount,
        date: manualBillForm.date,
        notes: manualBillForm.notes || null,
        status: "unpaid",
        created_by: null,
      });
      if (error) throw error;

      // Update client balance (add to balance)
      const { error: clientError } = await supabase
        .from("clients")
        .update({ current_balance: selectedClient.currentBalance + amount })
        .eq("id", selectedClient.id);
      if (clientError) throw clientError;

      await log({
        action: "create",
        entityType: "invoice",
        entityId: selectedClient.id,
        details: { type: "manual_bill", bill_number: manualBillForm.bill_number, amount },
      });

      toast({ title: "Success", description: `Manual bill ${manualBillForm.bill_number} added` });
      setSelectedClient({ ...selectedClient, currentBalance: selectedClient.currentBalance + amount });
      setManualBillForm({ bill_number: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
      setIsAddManualBillOpen(false);
      fetchClientDetails(selectedClient.id);
      fetchClients();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add manual bill", variant: "destructive" });
    } finally {
      setManualBillSaving(false);
    }
  };

  // Toggle manual bill paid/unpaid
  const handleToggleManualBillStatus = async (bill: ManualBill) => {
    const newStatus = bill.status === "paid" ? "unpaid" : "paid";
    try {
      const { error } = await supabase
        .from("manual_bills")
        .update({ status: newStatus })
        .eq("id", bill.id);
      if (error) throw error;

      // If marking as paid, reduce balance. If marking as unpaid, add back.
      if (selectedClient) {
        const balanceChange = newStatus === "paid" ? -bill.amount : bill.amount;
        await supabase
          .from("clients")
          .update({ current_balance: selectedClient.currentBalance + balanceChange })
          .eq("id", selectedClient.id);
        setSelectedClient({ ...selectedClient, currentBalance: selectedClient.currentBalance + balanceChange });
      }

      toast({ title: "Updated", description: `Bill marked as ${newStatus}` });
      if (selectedClient) {
        fetchClientDetails(selectedClient.id);
        fetchClients();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Client Detail View
  if (selectedClient) {
    // Build "All" combined list with running balance
    const allItemsRaw: { type: "bill" | "manual" | "recovery"; date: Date; data: any; runningBalance: number }[] = [
      ...clientInvoices.map((inv) => ({ type: "bill" as const, date: inv.createdAt, data: inv, runningBalance: 0 })),
      ...clientManualBills.map((bill) => ({ type: "manual" as const, date: new Date(bill.date), data: bill, runningBalance: 0 })),
      ...clientRecoveries.map((rec) => ({ type: "recovery" as const, date: rec.date, data: rec, runningBalance: 0 })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime()); // oldest first for balance calc

    // Calculate running balance starting from opening balance
    let runBal = selectedClient.openingBalance;
    for (const item of allItemsRaw) {
      if (item.type === "bill") {
        runBal += (item.data as Invoice).balanceDue;
      } else if (item.type === "manual") {
        runBal += (item.data as ManualBill).amount;
      } else {
        runBal -= (item.data as RecoveryRecord).amount;
      }
      item.runningBalance = runBal;
    }
    const allItems = [...allItemsRaw].reverse(); // newest first for display

    // Also compute per-tab running balances
    const invoicesWithBalance = [...clientInvoices].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let invBal = selectedClient.openingBalance;
    // For invoices-only view, we still accumulate all types but only show invoice rows
    // Better approach: use allItems filtered
    const invoiceBalanceMap = new Map<string, number>();
    const manualBillBalanceMap = new Map<string, number>();
    const recoveryBalanceMap = new Map<string, number>();
    for (const item of allItemsRaw) {
      if (item.type === "bill") invoiceBalanceMap.set((item.data as Invoice).id, item.runningBalance);
      else if (item.type === "manual") manualBillBalanceMap.set((item.data as ManualBill).id, item.runningBalance);
      else recoveryBalanceMap.set(item.data.id + '-' + item.date.getTime(), item.runningBalance);
    }

    const handlePrintManualBills = (paperSize: PaperSize = getPrintDefault("clientHistory")) => {
      if (!selectedClient) return;
      const totalAmount = clientManualBills.reduce((s, b) => s + b.amount, 0);
      const tableHtml = `<table><thead><tr><th>Bill #</th><th>Date</th><th>Amount</th><th>Status</th><th>Balance</th></tr></thead><tbody>
        ${clientManualBills.map(b => `<tr><td>${b.bill_number}</td><td>${format(new Date(b.date), "dd MMM yyyy")}</td><td>Rs ${b.amount.toLocaleString()}</td><td>${b.status}</td><td class="due-col">Rs ${(manualBillBalanceMap.get(b.id) || 0).toLocaleString()}</td></tr>`).join("")}
        <tr class="totals-row"><td colspan="2" style="text-align:right">Total:</td><td>Rs ${totalAmount.toLocaleString()}</td><td colspan="2"></td></tr>
        </tbody></table>`;
      openPrintWindow(generateBrandedPrintPage({ title: "Manual Bills History", subtitle: selectedClient.name, tableHtml, paperSize }));
    };

    const handlePrintAll = (paperSize: PaperSize = getPrintDefault("clientHistory")) => {
      if (!selectedClient) return;
      const tableHtml = `<table><thead><tr><th>Date & Time</th><th>Type</th><th>Ref</th><th>Amount</th><th>Via</th><th>Balance</th></tr></thead><tbody>
        <tr style="background:#f5f0eb"><td colspan="4" style="text-align:right;font-weight:600">Opening Balance</td><td></td><td class="due-col">Rs ${selectedClient.openingBalance.toLocaleString()}</td></tr>
        ${[...allItems].reverse().map(item => {
          if (item.type === "bill") {
            const inv = item.data as Invoice;
            return `<tr class="bill"><td>${format(inv.createdAt, "dd MMM yy, hh:mm a")}</td><td>Invoice</td><td>${inv.invoiceNumber}</td><td>Rs ${inv.total.toLocaleString()}</td><td>${inv.paymentMethod === "account" ? inv.accountName || "Acc" : "Cash"}</td><td class="due-col">Rs ${item.runningBalance.toLocaleString()}</td></tr>`;
          } else if (item.type === "manual") {
            const bill = item.data as ManualBill;
            return `<tr class="bill"><td>${format(new Date(bill.date), "dd MMM yy")}</td><td>Manual Bill</td><td>${bill.bill_number}</td><td>Rs ${bill.amount.toLocaleString()}</td><td>-</td><td class="due-col">Rs ${item.runningBalance.toLocaleString()}</td></tr>`;
          } else {
            const rec = item.data as RecoveryRecord;
            return `<tr class="recovery"><td>${format(rec.date, "dd MMM yy")}</td><td>${rec.isFromCity ? "City Rec." : "Recovery"}</td><td>-</td><td style="color:green">- Rs ${rec.amount.toLocaleString()}</td><td>-</td><td class="due-col">Rs ${item.runningBalance.toLocaleString()}</td></tr>`;
          }
        }).join("")}
        </tbody></table>`;
      openPrintWindow(generateBrandedPrintPage({ title: "Complete History", subtitle: selectedClient.name, tableHtml, paperSize }));
    };

    return (
      <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          {/* Top row with back button and title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} className="shrink-0 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">{selectedClient.name}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                {selectedClient.city !== "N/A" && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedClient.city}</span>}
                {selectedClient.referenceNumber !== "N/A" && <span>• Ref: {selectedClient.referenceNumber}</span>}
              </div>
            </div>
          </div>
          {/* Action row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button 
              onClick={() => setIsQuickRecoveryOpen(true)}
              className="gap-2 w-full sm:w-auto"
              size="sm"
            >
              <CreditCard className="w-4 h-4" />
              Add Recovery
            </Button>
            <div className="text-center sm:text-right bg-primary/5 rounded-lg p-2.5 sm:p-3">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-lg sm:text-2xl font-bold text-primary">
                Rs {selectedClient.currentBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Client Info Cards - 2 cols on mobile, 4 on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4"
        >
          <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-xs sm:text-sm truncate">{selectedClient.phone}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-xs sm:text-sm truncate">{selectedClient.email}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Opening Bal.</p>
                <p className="font-medium text-xs sm:text-sm">Rs {selectedClient.openingBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Spent</p>
                <p className="font-medium text-xs sm:text-sm">Rs {selectedClient.totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs for Bills and Recoveries */}
        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <TabsList className="w-full sm:w-auto grid grid-cols-4">
              <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="bills" className="gap-1 text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 hidden sm:block" /> Invoices ({clientInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="manual_bills" className="gap-1 text-xs sm:text-sm">
                <ClipboardList className="w-3.5 h-3.5 hidden sm:block" /> Bills ({clientManualBills.length})
              </TabsTrigger>
              <TabsTrigger value="recoveries" className="gap-1 text-xs sm:text-sm">
                <CreditCard className="w-3.5 h-3.5 hidden sm:block" /> Rec ({clientRecoveries.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* All Tab */}
          <TabsContent value="all">
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl shadow-card overflow-hidden">
              {allItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto hidden sm:block">
                    <table className="data-table min-w-[600px]">
                      <thead><tr><th>Date & Time</th><th>Type</th><th>Reference</th><th>Amount</th><th>Via</th><th>Balance</th></tr></thead>
                      <tbody>
                        {allItems.map((item, idx) => {
                          if (item.type === "bill") {
                            const inv = item.data as Invoice;
                            return (
                              <tr key={`bill-${inv.id}`} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewClientInvoice(inv.id)}>
                                <td className="text-sm text-muted-foreground whitespace-nowrap">
                                  <div>{format(inv.createdAt, "dd MMM yyyy")}</div>
                                  <div className="text-xs">{format(inv.createdAt, "hh:mm a")}</div>
                                </td>
                                <td><span className="status-badge status-badge-info">Invoice</span></td>
                                <td className="font-mono text-sm">{inv.invoiceNumber}</td>
                                <td className="font-semibold whitespace-nowrap">Rs {inv.total.toLocaleString()}</td>
                                <td className="text-xs text-muted-foreground capitalize">{inv.paymentMethod === "account" ? inv.accountName || "Account" : "Cash"}</td>
                                <td className="font-semibold text-destructive whitespace-nowrap">Rs {item.runningBalance.toLocaleString()}</td>
                              </tr>
                            );
                          } else if (item.type === "manual") {
                            const bill = item.data as ManualBill;
                            return (
                              <tr key={`manual-${bill.id}`}>
                                <td className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(bill.date), "dd MMM yyyy")}</td>
                                <td><span className="status-badge status-badge-warning">Bill</span></td>
                                <td className="font-mono text-sm">{bill.bill_number}</td>
                                <td className="font-semibold whitespace-nowrap">Rs {bill.amount.toLocaleString()}</td>
                                <td className="text-xs text-muted-foreground">-</td>
                                <td className="font-semibold text-destructive whitespace-nowrap">Rs {item.runningBalance.toLocaleString()}</td>
                              </tr>
                            );
                          } else {
                            const rec = item.data as RecoveryRecord;
                            return (
                              <tr key={`rec-${rec.id}-${idx}`}>
                                <td className="text-sm text-muted-foreground whitespace-nowrap">{format(rec.date, "dd MMM yyyy")}</td>
                                <td><span className={cn("status-badge", rec.isFromCity ? "status-badge-warning" : "status-badge-success")}>{rec.isFromCity ? "City Rec." : "Recovery"}</span></td>
                                <td className="text-sm text-muted-foreground">-</td>
                                <td className="font-semibold text-success whitespace-nowrap">Rs {rec.amount.toLocaleString()}</td>
                                <td className="text-xs text-muted-foreground">-</td>
                                <td className="font-semibold text-destructive whitespace-nowrap">Rs {item.runningBalance.toLocaleString()}</td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y">
                    {allItems.map((item, idx) => {
                      if (item.type === "bill") {
                        const inv = item.data as Invoice;
                        return (
                          <div key={`bill-${inv.id}`} className="p-4 space-y-2 cursor-pointer active:bg-muted/50" onClick={() => handleViewClientInvoice(inv.id)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-mono font-medium text-sm">{inv.invoiceNumber}</p>
                                <p className="text-xs text-muted-foreground">{format(inv.createdAt, "dd MMM yyyy")}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold whitespace-nowrap block">Rs {inv.total.toLocaleString()}</span>
                                <span className="text-xs text-destructive font-medium">Bal: Rs {item.runningBalance.toLocaleString()}</span>
                              </div>
                            </div>
                            <span className="status-badge status-badge-info">Invoice</span>
                          </div>
                        );
                      } else if (item.type === "manual") {
                        const bill = item.data as ManualBill;
                        return (
                          <div key={`manual-${bill.id}`} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-mono font-medium text-sm">{bill.bill_number}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(bill.date), "dd MMM yyyy")}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold whitespace-nowrap block">Rs {bill.amount.toLocaleString()}</span>
                                <span className="text-xs text-destructive font-medium">Bal: Rs {item.runningBalance.toLocaleString()}</span>
                              </div>
                            </div>
                            <span className="status-badge status-badge-warning">Bill</span>
                          </div>
                        );
                      } else {
                        const rec = item.data as RecoveryRecord;
                        return (
                          <div key={`rec-${rec.id}-${idx}`} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">{format(rec.date, "dd MMM yyyy")}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-success whitespace-nowrap block">Rs {rec.amount.toLocaleString()}</span>
                                <span className="text-xs text-destructive font-medium">Bal: Rs {item.runningBalance.toLocaleString()}</span>
                              </div>
                            </div>
                            <span className={cn("status-badge", rec.isFromCity ? "status-badge-warning" : "status-badge-success")}>{rec.isFromCity ? "City Rec." : "Recovery"}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No history</h3>
                  <p className="text-muted-foreground">No transactions for this client yet.</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="bills">
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm" onClick={() => handlePrint("bills", invoiceBalanceMap, recoveryBalanceMap)}>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl shadow-card overflow-hidden">
              {clientInvoices.length > 0 ? (
                <>
                   <div className="overflow-x-auto hidden sm:block">
                    <table className="data-table min-w-[700px]">
                      <thead><tr><th>Invoice #</th><th>Date & Time</th><th>Items</th><th>Total</th><th>Via</th><th>Status</th><th>Balance</th><th className="w-12"></th></tr></thead>
                      <tbody>
                        {clientInvoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="font-mono text-sm">{invoice.invoiceNumber}</td>
                            <td className="text-muted-foreground text-sm whitespace-nowrap">
                              <div>{format(invoice.createdAt, "dd MMM yyyy")}</div>
                              <div className="text-xs">{format(invoice.createdAt, "hh:mm a")}</div>
                            </td>
                            <td className="text-sm">{invoice.items.length} items</td>
                            <td className="font-semibold whitespace-nowrap">Rs {invoice.total.toLocaleString()}</td>
                            <td className="text-xs text-muted-foreground capitalize">{invoice.paymentMethod === "account" ? invoice.accountName || "Account" : "Cash"}</td>
                            <td><span className={cn("status-badge", invoice.status === "paid" && "status-badge-success", invoice.status === "partial" && "status-badge-warning", invoice.status === "overdue" && "status-badge-danger")}>{invoice.status}</span></td>
                            <td className="font-semibold text-destructive whitespace-nowrap">Rs {(invoiceBalanceMap.get(invoice.id) || 0).toLocaleString()}</td>
                            <td><Button variant="ghost" size="icon" onClick={() => handleViewClientInvoice(invoice.id)}><Eye className="w-4 h-4" /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y">
                    {clientInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 space-y-2 cursor-pointer active:bg-muted/50" onClick={() => handleViewClientInvoice(invoice.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono font-medium text-sm">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">{format(invoice.createdAt, "dd MMM yyyy, hh:mm a")} · {invoice.items.length} items</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold whitespace-nowrap block">Rs {invoice.total.toLocaleString()}</span>
                            <span className="text-xs text-destructive font-medium">Bal: Rs {(invoiceBalanceMap.get(invoice.id) || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("status-badge", invoice.status === "paid" && "status-badge-success", invoice.status === "partial" && "status-badge-warning", invoice.status === "overdue" && "status-badge-danger")}>{invoice.status}</span>
                          <span className="text-xs text-muted-foreground capitalize">· {invoice.paymentMethod === "account" ? invoice.accountName || "Account" : "Cash"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center"><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium text-foreground mb-1">No invoices yet</h3></div>
              )}
            </motion.div>
          </TabsContent>

          {/* Manual Bills Tab */}
          <TabsContent value="manual_bills">
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm" onClick={handlePrintManualBills}>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setIsAddManualBillOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Manual Bill
              </Button>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl shadow-card overflow-hidden">
              {clientManualBills.length > 0 ? (
                <>
                  <div className="overflow-x-auto hidden sm:block">
                    <table className="data-table min-w-[600px]">
                      <thead><tr><th>Bill #</th><th>Date</th><th>Amount</th><th>Status</th><th>Balance</th><th className="w-12"></th></tr></thead>
                      <tbody>
                        {clientManualBills.map((bill) => (
                          <tr key={bill.id}>
                            <td className="font-mono text-sm font-medium">{bill.bill_number}</td>
                            <td className="text-muted-foreground text-sm whitespace-nowrap">{format(new Date(bill.date), "dd MMM yyyy")}</td>
                            <td className="font-semibold whitespace-nowrap">Rs {bill.amount.toLocaleString()}</td>
                            <td><button onClick={() => handleToggleManualBillStatus(bill)} className={cn("status-badge cursor-pointer", bill.status === "paid" ? "status-badge-success" : "status-badge-danger")}>{bill.status}</button></td>
                            <td className="font-semibold text-destructive whitespace-nowrap">Rs {(manualBillBalanceMap.get(bill.id) || 0).toLocaleString()}</td>
                            <td><button onClick={() => handleToggleManualBillStatus(bill)} className="text-xs text-primary hover:underline">{bill.status === "paid" ? "Mark Unpaid" : "Mark Paid"}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y">
                    {clientManualBills.map((bill) => (
                      <div key={bill.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono font-medium text-sm">{bill.bill_number}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(bill.date), "dd MMM yyyy")}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold whitespace-nowrap block">Rs {bill.amount.toLocaleString()}</span>
                            <span className="text-xs text-destructive font-medium">Bal: Rs {(manualBillBalanceMap.get(bill.id) || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <button onClick={() => handleToggleManualBillStatus(bill)} className={cn("status-badge cursor-pointer", bill.status === "paid" ? "status-badge-success" : "status-badge-danger")}>{bill.status}</button>
                          {bill.notes && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{bill.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center"><ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium text-foreground mb-1">No manual bills</h3></div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="recoveries">
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm" onClick={() => handlePrint("recoveries", invoiceBalanceMap, recoveryBalanceMap)}>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl shadow-card overflow-hidden">
              {clientRecoveries.length > 0 ? (
                <>
                  <div className="overflow-x-auto hidden sm:block">
                    <table className="data-table min-w-[600px]">
                      <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Balance</th></tr></thead>
                      <tbody>
                        {clientRecoveries.map((recovery) => (
                          <tr key={recovery.id}>
                            <td className="text-muted-foreground text-sm whitespace-nowrap">{format(recovery.date, "dd MMM yyyy")}</td>
                            <td className="font-semibold text-success whitespace-nowrap">Rs {recovery.amount.toLocaleString()}</td>
                            <td><span className={cn("status-badge", recovery.isFromCity ? "status-badge-warning" : "status-badge-success")}>{recovery.isFromCity ? "City Recovery" : "Individual"}</span></td>
                            <td className="font-semibold text-destructive whitespace-nowrap">Rs {(recoveryBalanceMap.get(recovery.id + '-' + recovery.date.getTime()) || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y">
                    {clientRecoveries.map((recovery) => (
                      <div key={recovery.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{format(recovery.date, "dd MMM yyyy")}</p>
                            {recovery.notes && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{recovery.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-success whitespace-nowrap block">Rs {recovery.amount.toLocaleString()}</span>
                            <span className="text-xs text-destructive font-medium">Bal: Rs {(recoveryBalanceMap.get(recovery.id + '-' + recovery.date.getTime()) || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={cn("status-badge", recovery.isFromCity ? "status-badge-warning" : "status-badge-success")}>{recovery.isFromCity ? "City Recovery" : "Individual"}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center"><CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium text-foreground mb-1">No recoveries yet</h3></div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        <InvoiceViewDialog
          open={viewInvoiceDialogOpen}
          onOpenChange={setViewInvoiceDialogOpen}
          invoice={selectedInvoice}
          onPrint={() => {
            if (selectedInvoice) {
              window.print();
            }
          }}
        />
        <Dialog open={isQuickRecoveryOpen} onOpenChange={(open) => {
          setIsQuickRecoveryOpen(open);
          if (!open) setRecoveryType("individual");
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Add Recovery
              </DialogTitle>
              <DialogDescription>
                Record a payment from {selectedClient.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Recovery Type Toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRecoveryType("individual")}
                  className={cn(
                    "flex-1 py-2.5 px-3 text-sm font-medium transition-colors",
                    recoveryType === "individual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryType("city")}
                  className={cn(
                    "flex-1 py-2.5 px-3 text-sm font-medium transition-colors border-l border-border",
                    recoveryType === "city"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  City Recovery
                </button>
              </div>

              {recoveryType === "city" && (
                <div className="p-3 rounded-lg bg-accent/50 border border-accent text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  This will be added to today's city recovery list for <span className="font-medium text-foreground">{selectedClient.city !== "N/A" ? selectedClient.city : "Unknown"}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Balance</span>
                  <span className="font-bold text-primary">
                    Rs {selectedClient.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quickAmount">Recovery Amount (Rs)</Label>
                <Input
                  id="quickAmount"
                  type="number"
                  value={quickRecoveryAmount}
                  onChange={(e) => setQuickRecoveryAmount(e.target.value)}
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={quickRecoveryAccountId || "cash"} onValueChange={(v) => setQuickRecoveryAccountId(v === "cash" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    {paymentAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quickNotes">Notes (Optional)</Label>
                <Textarea
                  id="quickNotes"
                  value={quickRecoveryNotes}
                  onChange={(e) => setQuickRecoveryNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                />
              </div>
              
              {quickRecoveryAmount && parseFloat(quickRecoveryAmount) > 0 && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Balance After Recovery</span>
                    <span className="font-bold text-success">
                      Rs {(selectedClient.currentBalance - parseFloat(quickRecoveryAmount)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuickRecoveryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setShowQuickRecoveryConfirm(true)}
                disabled={!quickRecoveryAmount || parseFloat(quickRecoveryAmount) <= 0}
              >
                Add Recovery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Recovery Confirmation */}
        <AlertDialog open={showQuickRecoveryConfirm} onOpenChange={setShowQuickRecoveryConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Recovery</AlertDialogTitle>
              <AlertDialogDescription>
                Add recovery of Rs {parseFloat(quickRecoveryAmount || "0").toLocaleString()} for {selectedClient.name}?
                <br />
                <span className="text-sm mt-2 block">
                  Balance will be updated from Rs {selectedClient.currentBalance.toLocaleString()} to Rs {(selectedClient.currentBalance - parseFloat(quickRecoveryAmount || "0")).toLocaleString()}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={quickRecoveryLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleQuickRecovery} disabled={quickRecoveryLoading}>
                {quickRecoveryLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Manual Bill Dialog */}
        <Dialog open={isAddManualBillOpen} onOpenChange={setIsAddManualBillOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Add Manual Bill
              </DialogTitle>
              <DialogDescription>
                Record an offline bill for {selectedClient.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="billNumber">Bill / Reference Number *</Label>
                <Input
                  id="billNumber"
                  value={manualBillForm.bill_number}
                  onChange={(e) => setManualBillForm(prev => ({ ...prev, bill_number: e.target.value }))}
                  placeholder="e.g. BILL-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billAmount">Amount (Rs) *</Label>
                <Input
                  id="billAmount"
                  type="number"
                  value={manualBillForm.amount}
                  onChange={(e) => setManualBillForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billDate">Date</Label>
                <Input
                  id="billDate"
                  type="date"
                  value={manualBillForm.date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setManualBillForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billNotes">Notes (Optional)</Label>
                <Textarea
                  id="billNotes"
                  value={manualBillForm.notes}
                  onChange={(e) => setManualBillForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Description or details..."
                  rows={2}
                />
              </div>
              {manualBillForm.amount && parseFloat(manualBillForm.amount) > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Balance After Bill</span>
                    <span className="font-bold text-warning">
                      Rs {(selectedClient.currentBalance + parseFloat(manualBillForm.amount)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddManualBillOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setShowManualBillConfirm(true)}
                disabled={manualBillSaving || !manualBillForm.bill_number || !manualBillForm.amount}
              >
                {manualBillSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Bill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Bill Confirmation */}
        <AlertDialog open={showManualBillConfirm} onOpenChange={setShowManualBillConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Manual Bill</AlertDialogTitle>
              <AlertDialogDescription>
                Add bill <span className="font-semibold">{manualBillForm.bill_number}</span> for{" "}
                <span className="font-semibold">Rs {parseFloat(manualBillForm.amount || "0").toLocaleString()}</span>{" "}
                to <span className="font-semibold">{selectedClient.name}</span>?
                This will increase their balance accordingly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowManualBillConfirm(false); handleAddManualBill(); }}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Main Clients List View
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportClients}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setDuplicateWarning(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {duplicateWarning && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Duplicate Client</AlertTitle>
                    <AlertDescription>{duplicateWarning}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name *</Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) => {
                        setNewClient({ ...newClient, name: e.target.value });
                        setDuplicateWarning(null);
                      }}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Opening Balance (Rs)</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={newClient.openingBalance}
                      onChange={(e) =>
                        setNewClient({ ...newClient, openingBalance: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) => {
                        // Only allow digits and auto-format as 0XXX-XXXXXXX
                        const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                        let formatted = raw;
                        if (raw.length > 4) {
                          formatted = raw.slice(0, 4) + "-" + raw.slice(4);
                        }
                        setNewClient({ ...newClient, phone: formatted });
                        setDuplicateWarning(null);
                      }}
                      placeholder="0306-1728311"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                    <CityCombobox
                      value={newClient.city}
                      onChange={(city) => setNewClient({ ...newClient, city })}
                      existingCities={existingCities}
                      placeholder="Select or add city..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="address"
                    value={newClient.address}
                    onChange={(e) =>
                      setNewClient({ ...newClient, address: e.target.value })
                    }
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber">Reference Number <span className="text-destructive">*</span></Label>
                    <ReferenceCombobox
                      value={newClient.referenceNumber}
                      onChange={(ref) => setNewClient({ ...newClient, referenceNumber: ref })}
                      existingReferences={existingReferences}
                      placeholder="Select or type reference..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) =>
                        setNewClient({ ...newClient, email: e.target.value })
                      }
                      placeholder="Enter email"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (checkDuplicateClient()) return;
                  setShowAddClientConfirm(true);
                }}>Add Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, city, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-foreground">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => {
                      setFilterCity("all");
                      setFilterBalance("all");
                      setSortBy("name");
                    }}
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> City
                  </Label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> Balance
                  </Label>
                  <Select value={filterBalance} onValueChange={setFilterBalance}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Balances" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Balances</SelectItem>
                      <SelectItem value="positive">Has Balance (Owes)</SelectItem>
                      <SelectItem value="zero">Zero Balance</SelectItem>
                      <SelectItem value="negative">Credit (Overpaid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <SortAsc className="w-3 h-3" /> Sort By
                  </Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="balance_high">Balance (High → Low)</SelectItem>
                      <SelectItem value="balance_low">Balance (Low → High)</SelectItem>
                      <SelectItem value="invoices">Most Invoices</SelectItem>
                      <SelectItem value="recent">Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                Showing {filteredClients.length} of {clients.length} clients
              </p>
            </PopoverContent>
          </Popover>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none",
                viewMode === "grid" && "bg-muted"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none",
                viewMode === "list" && "bg-muted"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Clients Grid/List */}
      {viewMode === "grid" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedClient(client)}
              className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {client.invoiceCount} invoices
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditClient(client);
                    }}>
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPinDialog(client);
                      }}
                    >
                      <Key className="w-4 h-4" />
                      Manage PIN
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteClientId(client.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{client.city}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className={cn(
                    "text-lg font-bold",
                    client.currentBalance > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    Rs {client.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl shadow-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table min-w-[700px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Opening Bal.</th>
                  <th>Current Bal.</th>
                  <th>Invoices</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="text-sm whitespace-nowrap">{client.phone}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{client.email}</p>
                      </div>
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap">{client.city}</td>
                    <td className="whitespace-nowrap">Rs {client.openingBalance.toLocaleString()}</td>
                    <td className={cn(
                      "font-medium whitespace-nowrap",
                      client.currentBalance > 0 ? "text-destructive" : "text-foreground"
                    )}>
                      Rs {client.currentBalance.toLocaleString()}
                    </td>
                    <td>{client.invoiceCount}</td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClient(client);
                          }}>
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPinDialog(client);
                            }}
                          >
                            <Key className="w-4 h-4" />
                            Manage PIN
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteClientId(client.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {filteredClients.length === 0 && (
        <div className="bg-card rounded-xl p-12 text-center shadow-card">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No clients found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or add a new client.
          </p>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAddClientConfirm} onOpenChange={setShowAddClientConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{newClient.name}" as a new client?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddClient}>Add Client</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Management Dialog */}
      <Dialog open={!!pinDialogClient} onOpenChange={() => {
        setPinDialogClient(null);
        setNewPin("");
        setConfirmPin("");
        setCurrentClientPin(null);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Manage Client PIN
            </DialogTitle>
            <DialogDescription>
              {pinDialogClient?.name} - Set or change the portal login PIN
            </DialogDescription>
          </DialogHeader>
          {pinLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {currentClientPin && (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertTitle>PIN Already Set</AlertTitle>
                  <AlertDescription>
                    This client already has a portal PIN. Enter a new PIN to change it.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="newPin">{currentClientPin ? "New PIN" : "PIN"} *</Label>
                <Input
                  id="newPin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4+ digit PIN"
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN *</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Confirm PIN"
                  maxLength={8}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {currentClientPin && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleRemovePin}
              >
                Remove PIN
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setPinDialogClient(null)}>
                Cancel
              </Button>
              <Button onClick={handleSavePin} disabled={!newPin || !confirmPin}>
                {currentClientPin ? "Update PIN" : "Set PIN"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientDialogOpen} onOpenChange={(open) => {
        setEditClientDialogOpen(open);
        if (!open) setEditClientData(null);
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={editClientForm.phone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                    let formatted = raw;
                    if (raw.length > 4) formatted = raw.slice(0, 4) + "-" + raw.slice(4);
                    setEditClientForm(prev => ({ ...prev, phone: formatted }));
                  }}
                  placeholder="0306-1728311"
                  maxLength={12}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editClientForm.email}
                  onChange={(e) => setEditClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <CityCombobox
                  value={editClientForm.city}
                  onChange={(city) => setEditClientForm(prev => ({ ...prev, city }))}
                  existingCities={existingCities}
                  placeholder="Select or add city..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editClientForm.address}
                onChange={(e) => setEditClientForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <ReferenceCombobox
                value={editClientForm.referenceNumber}
                onChange={(ref) => setEditClientForm(prev => ({ ...prev, referenceNumber: ref }))}
                existingReferences={existingReferences}
                placeholder="Select or type reference..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClientDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditClient} disabled={editClientSaving}>
              {editClientSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
