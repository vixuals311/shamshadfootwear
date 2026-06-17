import { useState, useMemo, useEffect, useCallback } from "react";
import { generateBrandedPrintPage, openPrintWindow, type PaperSize } from "@/utils/printUtils";
import { getPrintDefault } from "@/utils/printPreferences";
import { PrintButton } from "@/components/common/PrintButton";
import { useAutoPrintModalPrompt } from "@/context/AutoPrintModalContext";
import { generatePaymentReceiptHTML } from "@/utils/printUtils";
import { buildPaymentReceiptDescription } from "@/utils/autoPrintDescriptions";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Printer,
  CreditCard,
  User,
  MapPin,
  Calendar as CalendarIcon,
  GripVertical,
  Loader2,
  Save,
  FileText,
  Trash2,
  Play,
  Check,
  CheckCircle2,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/utils/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useRecoveryDrafts, DraftClientRecovery, RecoveryDraft } from "@/hooks/useRecoveryDrafts";
import { getCachedData, addToSyncQueue, updateCachedRecord } from "@/lib/offlineDb";

interface Client {
  id: string;
  name: string;
  phone: string;
  city: string;
  currentBalance: number;
}

interface Recovery {
  id: string;
  clientId?: string;
  clientName?: string;
  city?: string;
  amount: number;
  date: Date;
  notes?: string;
  type: "client" | "city";
  clientAmounts?: { clientId: string; clientName: string; amount: number }[];
}

interface PaymentAccount {
  id: string;
  name: string;
}

interface CityClientRecovery {
  clientId: string;
  clientName: string;
  phone: string;
  currentBalance: number;
  recoveryAmount: string;
  isCollected?: boolean;
  accountId?: string;
}

interface SortableCityItem {
  city: string;
  clientCount: number;
}

const RecoveryPage = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const promptAutoPrint = useAutoPrintModalPrompt();
  const { drafts, saveDraft, deleteDraft, getDraftForCityDate } = useRecoveryDrafts();
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddRecoveryOpen, setIsAddRecoveryOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isDraftsDialogOpen, setIsDraftsDialogOpen] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortedCities, setSortedCities] = useState<SortableCityItem[]>([]);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [draggedCity, setDraggedCity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  // Recovery category selection
  const [recoveryCategory, setRecoveryCategory] = useState<"client" | "city">("client");

  // Confirmation dialogs
  const [showAddRecoveryConfirm, setShowAddRecoveryConfirm] = useState(false);
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);

  const [clientRecovery, setClientRecovery] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    notes: "",
    accountId: "",
  });

  const [cityRecoveryCity, setCityRecoveryCity] = useState("");
  const [cityRecoveryNotes, setCityRecoveryNotes] = useState("");
  const [cityRecoveryDate, setCityRecoveryDate] = useState<Date>(new Date());
  const [cityClientRecoveries, setCityClientRecoveries] = useState<CityClientRecovery[]>([]);
  const [cityClientSearch, setCityClientSearch] = useState("");
  const [loadingCityClients, setLoadingCityClients] = useState(false);

  // Helper to detect network errors
  const isNetworkError = (error: any): boolean => {
    const msg = error?.message || String(error);
    return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('TypeError') || msg.includes('Load failed');
  };

  // Load from cache helper
  const loadFromCache = async () => {
    const cachedClients = await getCachedData("clients");
    const formattedClients = (cachedClients || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      city: c.city || "Unknown",
      currentBalance: c.current_balance || 0,
    }));
    setClients(formattedClients);

    const cachedRecoveries = await getCachedData("recoveries");
    const formattedRecoveries = (cachedRecoveries || []).map((r: any) => ({
      id: r.id,
      clientId: r.client_id,
      clientName: r.client_name || "Unknown",
      city: r.city,
      amount: r.amount,
      date: new Date(r.date),
      notes: r.notes,
      type: r.type as "client" | "city",
      clientAmounts: [],
    }));
    setRecoveries(formattedRecoveries);

    toast({
      title: "Offline Mode",
      description: "Showing cached data. Changes will sync when back online.",
    });
  };

  // Fetch data — always try network first, fall back to cache on any error
  const fetchData = async () => {
    try {
      setLoading(true);

      const [{ data: clientsData, error: clientsError }, { data: accountsData }] = await Promise.all([
        supabase.from("clients").select("id, name, phone, city, current_balance").order("name"),
        supabase.from("payment_accounts").select("*").order("name"),
      ]);

      if (clientsError) throw clientsError;
      setPaymentAccounts((accountsData || []).map(a => ({ id: a.id, name: a.name })));

      const formattedClients = (clientsData || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        city: c.city || "Unknown",
        currentBalance: c.current_balance || 0,
      }));

      const { data: recoveriesData, error: recoveriesError } = await supabase
        .from("recoveries")
        .select(`
          id, client_id, city, amount, date, notes, type,
          clients (name),
          recovery_client_amounts (client_id, amount, clients (name))
        `)
        .order("date", { ascending: false });

      if (recoveriesError) throw recoveriesError;

      const formattedRecoveries = (recoveriesData || []).map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.clients?.name,
        city: r.city,
        amount: r.amount,
        date: new Date(r.date),
        notes: r.notes,
        type: r.type as "client" | "city",
        clientAmounts: r.recovery_client_amounts?.map((rca: any) => ({
          clientId: rca.client_id,
          clientName: rca.clients?.name || "Unknown",
          amount: rca.amount,
        })),
      }));

      setClients(formattedClients);
      setRecoveries(formattedRecoveries);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      try {
        await loadFromCache();
      } catch {
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique cities
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(clients.map((c) => c.city).filter(Boolean))];
    return uniqueCities.map((city) => ({
      city,
      clientCount: clients.filter((c) => c.city === city).length,
    }));
  }, [clients]);

  // Update sorted cities when selection changes
  useEffect(() => {
    const newSelectedCities = cities.filter((c) => selectedCities.includes(c.city));
    // Add new cities to the end of sorted list
    const existingSorted = sortedCities.filter((sc) => selectedCities.includes(sc.city));
    const newCities = newSelectedCities.filter(
      (nc) => !existingSorted.some((sc) => sc.city === nc.city)
    );
    setSortedCities([...existingSorted, ...newCities]);
  }, [selectedCities, cities]);

  // Get clients by selected cities for print, sorted by drag order
  const clientsByCities = useMemo(() => {
    if (sortedCities.length === 0) return [];
    
    const cityOrder = sortedCities.map((sc) => sc.city);
    
    return clients
      .filter((c) => selectedCities.includes(c.city))
      .sort((a, b) => {
        const aIdx = cityOrder.indexOf(a.city);
        const bIdx = cityOrder.indexOf(b.city);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.name.localeCompare(b.name);
      });
  }, [clients, selectedCities, sortedCities]);

  // Update city client recoveries when city or date changes
  const handleCityChange = async (city: string) => {
    setCityRecoveryCity(city);
    await loadCityClientsForDate(city, cityRecoveryDate);
  };

  const handleCityRecoveryDateChange = async (date: Date | undefined) => {
    if (!date) return;
    setCityRecoveryDate(date);
    if (cityRecoveryCity) {
      await loadCityClientsForDate(cityRecoveryCity, date);
    }
  };

  // Check for existing draft when city/date changes
  useEffect(() => {
    if (cityRecoveryCity && cityRecoveryDate && !activeDraftId) {
      const existingDraft = getDraftForCityDate(cityRecoveryCity, cityRecoveryDate);
      if (existingDraft) {
        // Prompt user to resume draft
        toast({
          title: "Draft found",
          description: `Resume your saved progress for ${existingDraft.city}?`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResumeDraft(existingDraft)}
            >
              Resume
            </Button>
          ),
        });
      }
    }
  }, [cityRecoveryCity, cityRecoveryDate]);

  // Load clients for a city with balances calculated for a specific date
  const loadCityClientsForDate = async (city: string, date: Date) => {
    setLoadingCityClients(true);
    try {
      // Get all clients in this city
      const cityClients = clients.filter((c) => c.city === city);

      let clientBalances: CityClientRecovery[];

      // Always try network first, fall back to cached data on error
      try {
        const dateStr = format(date, "yyyy-MM-dd");
        
        const [{ data: invoicesData }, { data: recoveriesData }, { data: cityRecoveriesData }] = await Promise.all([
          supabase
            .from("invoices")
            .select("client_id, balance_due, created_at")
            .in("client_id", cityClients.map(c => c.id))
            .lte("created_at", `${dateStr}T23:59:59.999Z`),
          supabase
            .from("recoveries")
            .select("client_id, amount, date")
            .in("client_id", cityClients.map(c => c.id))
            .lte("date", dateStr),
          supabase
            .from("recovery_client_amounts")
            .select(`client_id, amount, recoveries (date)`)
            .in("client_id", cityClients.map(c => c.id)),
        ]);
      } catch (networkErr) {
        // Network failed — just use cached client data (already in cityClients)
        console.warn("Network unavailable for city clients, using cached data");
      }

      const existingDraft = getDraftForCityDate(city, date);

      clientBalances = cityClients.map((client) => {
        const draftClient = existingDraft?.clients.find(c => c.clientId === client.id);
        return {
          clientId: client.id,
          clientName: client.name,
          phone: client.phone,
          currentBalance: client.currentBalance,
          recoveryAmount: draftClient?.recoveryAmount || "",
          isCollected: draftClient?.isCollected || false,
        };
      });

      if (existingDraft) {
        setActiveDraftId(existingDraft.id);
        setCityRecoveryNotes(existingDraft.notes);
      }

      setCityClientRecoveries(clientBalances);
    } catch (error: any) {
      console.error("Error loading city clients:", error);
      if (!isNetworkError(error)) {
        toast({
          title: "Error",
          description: "Failed to load client data",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingCityClients(false);
    }
  };

  // Resume a draft
  const handleResumeDraft = (draft: RecoveryDraft) => {
    setRecoveryCategory("city");
    setCityRecoveryCity(draft.city);
    setCityRecoveryDate(new Date(draft.date));
    setCityRecoveryNotes(draft.notes);
    setActiveDraftId(draft.id);
    
    // Load the draft's client data
    setCityClientRecoveries(draft.clients.map(c => ({
      clientId: c.clientId,
      clientName: c.clientName,
      phone: c.phone,
      currentBalance: c.currentBalance,
      recoveryAmount: c.recoveryAmount,
      isCollected: c.isCollected,
    })));
    
    setIsAddRecoveryOpen(true);
    setIsDraftsDialogOpen(false);
    
    toast({
      title: "Draft loaded",
      description: `Resumed ${draft.city} recovery from ${format(new Date(draft.updatedAt), "dd MMM, HH:mm")}`,
    });
  };

  // Save current city recovery as draft
  const handleSaveDraft = () => {
    if (!cityRecoveryCity) {
      toast({
        title: "Select a city",
        description: "Please select a city before saving draft",
        variant: "destructive",
      });
      return;
    }

    const draftClients: DraftClientRecovery[] = cityClientRecoveries.map(c => ({
      clientId: c.clientId,
      clientName: c.clientName,
      phone: c.phone,
      currentBalance: c.currentBalance,
      recoveryAmount: c.recoveryAmount,
      isCollected: c.isCollected || false,
    }));

    const savedDraft = saveDraft({
      city: cityRecoveryCity,
      date: cityRecoveryDate.toISOString(),
      notes: cityRecoveryNotes,
      clients: draftClients,
    });

    if (savedDraft) {
      setActiveDraftId(savedDraft.id);
    }

    toast({
      title: "Draft saved",
      description: `Progress saved for ${cityRecoveryCity}. You can close and resume later.`,
    });
  };

  // Toggle client collected status
  const toggleClientCollected = (clientId: string) => {
    setCityClientRecoveries(prev =>
      prev.map(c =>
        c.clientId === clientId ? { ...c, isCollected: !c.isCollected } : c
      )
    );
  };

  // Delete a draft
  const handleDeleteDraft = (draftId: string) => {
    deleteDraft(draftId);
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
    setShowDeleteDraftConfirm(false);
    setDraftToDelete(null);
    toast({
      title: "Draft deleted",
      description: "The draft has been removed",
    });
  };

  const updateClientRecoveryAmount = (clientId: string, amount: string) => {
    setCityClientRecoveries((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, recoveryAmount: amount } : c))
    );
  };

  const updateClientAccountId = (clientId: string, accountId: string) => {
    setCityClientRecoveries((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, accountId: accountId === "cash" ? "" : accountId } : c))
    );
  };

  // Filter city clients by search
  const filteredCityClients = useMemo(() => {
    if (!cityClientSearch.trim()) return cityClientRecoveries;
    const search = cityClientSearch.toLowerCase();
    return cityClientRecoveries.filter(
      (c) =>
        c.clientName.toLowerCase().includes(search) ||
        c.phone.includes(search)
    );
  }, [cityClientRecoveries, cityClientSearch]);

  const filteredRecoveries = recoveries.filter((recovery) => {
    const matchesSearch =
      recovery.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recovery.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = !selectedDate || 
      format(recovery.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
    
    return matchesSearch && matchesDate;
  });

  const handleSelectClient = (client: Client) => {
    setClientRecovery({
      ...clientRecovery,
      clientId: client.id,
      clientName: client.name,
    });
    setClientSearchOpen(false);
  };

  const handleAddRecovery = async () => {
    if (isSavingRecovery) return;
    setIsSavingRecovery(true);

    // Holds data for the post-save payment-receipt prompt so it can be shown
    // after the add-recovery dialog is fully closed.
    let paymentReceiptPrompt: {
      amount: number;
      clientName: string;
      receiptHtml: string;
      previousBalance?: number;
      account?: string | null;
    } | null = null;

    try {
      if (recoveryCategory === "client") {
        if (!clientRecovery.clientId || !clientRecovery.amount) return;

        const recoveryData: any = {
          client_id: clientRecovery.clientId,
          amount: parseFloat(clientRecovery.amount),
          notes: clientRecovery.notes || null,
          type: "client",
          ...(clientRecovery.accountId ? { account_id: clientRecovery.accountId } : {}),
        };

        let onlineSaved = false;
        try {
          const { error } = await supabase.from("recoveries").insert(recoveryData);
          if (error) throw error;

          // Update client balance
          const client = clients.find((c) => c.id === clientRecovery.clientId);
          if (client) {
            await supabase
              .from("clients")
              .update({
                current_balance: client.currentBalance - parseFloat(clientRecovery.amount),
              })
              .eq("id", clientRecovery.clientId);
          }
          onlineSaved = true;
        } catch (netErr: any) {
          if (!isNetworkError(netErr)) throw netErr;
          // Network error — queue offline
          const offlineId = crypto.randomUUID();
          await addToSyncQueue({ table: "recoveries", operation: "insert", data: { ...recoveryData, id: offlineId } });
          await updateCachedRecord("recoveries", offlineId, { ...recoveryData, id: offlineId, date: new Date().toISOString() });

          const client = clients.find((c) => c.id === clientRecovery.clientId);
          if (client) {
            const newBalance = client.currentBalance - parseFloat(clientRecovery.amount);
            await addToSyncQueue({ table: "clients", operation: "update", data: { current_balance: newBalance }, recordId: client.id });
            await updateCachedRecord("clients", client.id, { ...client, current_balance: newBalance });
          }
        }

        try {
          await log({
            action: "create",
            entityType: "recovery",
            details: { type: "client", clientName: clientRecovery.clientName, amount: parseFloat(clientRecovery.amount) },
          });
        } catch { /* skip audit log if offline */ }

        toast({
          title: onlineSaved ? "Success" : "Queued for sync",
          description: onlineSaved ? "Client recovery added" : "Recovery saved offline and will sync when back online.",
        });

        // Capture payment receipt data (individual recoveries only).
        const amt = parseFloat(clientRecovery.amount);
        const acctName = clientRecovery.accountId
          ? (paymentAccounts.find((a) => a.id === clientRecovery.accountId)?.name || null)
          : "Cash";
        const previousBalance = clients.find((c) => c.id === clientRecovery.clientId)?.currentBalance;
        paymentReceiptPrompt = {
          amount: amt,
          clientName: clientRecovery.clientName,
          previousBalance,
          receiptHtml: generatePaymentReceiptHTML({
            clientName: clientRecovery.clientName,
            amount: amt,
            account: acctName,
            notes: clientRecovery.notes || null,
            paperSize: getPrintDefault("paymentReceipt"),
            previousBalance,
          }),
        };

        setClientRecovery({ clientId: "", clientName: "", amount: "", notes: "", accountId: "" });
      } else {
        if (!cityRecoveryCity) return;

        const clientAmounts = cityClientRecoveries.filter(
          (c) => parseFloat(c.recoveryAmount) > 0
        );
        const totalAmount = clientAmounts.reduce(
          (sum, c) => sum + parseFloat(c.recoveryAmount),
          0
        );

        if (totalAmount === 0) return;

        let onlineSaved = false;
        try {
          const { data: recoveryResult, error: recoveryError } = await supabase
            .from("recoveries")
            .insert({
              city: cityRecoveryCity,
              amount: totalAmount,
              notes: cityRecoveryNotes || null,
              type: "city",
              date: format(cityRecoveryDate, "yyyy-MM-dd"),
            })
            .select()
            .single();

          if (recoveryError) throw recoveryError;

          const clientAmountInserts = clientAmounts.map((ca) => ({
            recovery_id: recoveryResult.id,
            client_id: ca.clientId,
            amount: parseFloat(ca.recoveryAmount),
            ...(ca.accountId ? { account_id: ca.accountId } : {}),
          }));

          const { error: amountsError } = await supabase
            .from("recovery_client_amounts")
            .insert(clientAmountInserts);

          if (amountsError) throw amountsError;

          for (const ca of clientAmounts) {
            const client = clients.find((c) => c.id === ca.clientId);
            if (client) {
              await supabase
                .from("clients")
                .update({
                  current_balance: client.currentBalance - parseFloat(ca.recoveryAmount),
                })
                .eq("id", ca.clientId);
            }
          }

          try {
            await log({
              action: "create",
              entityType: "recovery",
              entityId: recoveryResult.id,
              details: { type: "city", city: cityRecoveryCity, amount: totalAmount, clients: clientAmounts.length },
            });
          } catch { /* skip audit log if offline */ }
          onlineSaved = true;
        } catch (netErr: any) {
          if (!isNetworkError(netErr)) throw netErr;
          // Network error — queue offline as a SINGLE consolidated entry
          const offlineRecoveryId = crypto.randomUUID();
          
          // Build consolidated recovery data with embedded client amounts
          const consolidatedData = {
            recovery: {
              id: offlineRecoveryId,
              city: cityRecoveryCity,
              amount: totalAmount,
              notes: cityRecoveryNotes || null,
              type: "city",
              date: format(cityRecoveryDate, "yyyy-MM-dd"),
            },
            clientAmounts: clientAmounts.map(ca => ({
              client_id: ca.clientId,
              amount: parseFloat(ca.recoveryAmount),
            })),
            clientBalanceUpdates: clientAmounts.map(ca => {
              const client = clients.find(c => c.id === ca.clientId);
              return {
                client_id: ca.clientId,
                new_balance: client ? client.currentBalance - parseFloat(ca.recoveryAmount) : 0,
              };
            }),
          };

          // Queue as a single "city_recovery" operation
          await addToSyncQueue({ 
            table: "city_recovery", 
            operation: "insert", 
            data: consolidatedData 
          });
          
          // Update local cache
          await updateCachedRecord("recoveries", offlineRecoveryId, consolidatedData.recovery);
          for (const update of consolidatedData.clientBalanceUpdates) {
            const client = clients.find(c => c.id === update.client_id);
            if (client) {
              await updateCachedRecord("clients", update.client_id, { ...client, current_balance: update.new_balance });
            }
          }
        }

        toast({
          title: onlineSaved ? "Success" : "Queued for sync",
          description: onlineSaved ? "City recovery added" : "City recovery saved offline. Will sync when back online.",
        });
        setCityRecoveryCity("");
        setCityRecoveryNotes("");
        setCityRecoveryDate(new Date());
        setCityClientRecoveries([]);
      }

      setShowAddRecoveryConfirm(false);
      setIsAddRecoveryOpen(false);
      setRecoveryCategory("client");

      if (activeDraftId) {
        deleteDraft(activeDraftId);
        setActiveDraftId(null);
      }

      fetchData();
      setRecoveryCategory("client");

      // Show the centered print prompt after the add-recovery dialog is closed.
      if (paymentReceiptPrompt) {
        const prevBalance = paymentReceiptPrompt.previousBalance ?? 0;
        promptAutoPrint(
          "paymentReceipt",
          "Recovery saved",
          `Rs ${paymentReceiptPrompt.amount.toLocaleString()} • ${paymentReceiptPrompt.clientName} (Previous: Rs ${prevBalance.toLocaleString()} | Remaining: Rs ${(prevBalance - paymentReceiptPrompt.amount).toLocaleString()})`,
          () => paymentReceiptPrompt!.receiptHtml,
        );
      }

    } catch (error: any) {
      // If network error, data was queued — close dialog gracefully
      if (isNetworkError(error)) {
        setShowAddRecoveryConfirm(false);
        setIsAddRecoveryOpen(false);
        setRecoveryCategory("client");
        if (activeDraftId) {
          deleteDraft(activeDraftId);
          setActiveDraftId(null);
        }
        fetchData();
        return;
      }
      console.error("Error adding recovery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add recovery",
        variant: "destructive",
      });
    } finally {
      setIsSavingRecovery(false);
    }
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  // Drag and drop handlers for city sorting
  const handleDragStart = (city: string) => {
    setDraggedCity(city);
  };

  const handleDragOver = (e: React.DragEvent, targetCity: string) => {
    e.preventDefault();
    if (!draggedCity || draggedCity === targetCity) return;

    setSortedCities((prev) => {
      const dragIdx = prev.findIndex((c) => c.city === draggedCity);
      const targetIdx = prev.findIndex((c) => c.city === targetCity);
      if (dragIdx === -1 || targetIdx === -1) return prev;

      const newOrder = [...prev];
      const [dragged] = newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, dragged);
      return newOrder;
    });
  };

  const handleDragEnd = () => {
    setDraggedCity(null);
  };

  const handlePrintRecoveryList = (paperSize: PaperSize = getPrintDefault("recoveryList")) => {
    if (selectedCities.length === 0) return;

    const cityOrder = sortedCities.map((sc) => sc.city);
    const citiesTitle = cityOrder.join(", ");

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>City</th>
            <th>Client Name</th>
            <th>Phone</th>
            ${includePreviousBalance ? '<th>Pending Balance</th>' : ''}
            <th class="amount-col">Recovery Amount</th>
          </tr>
        </thead>
        <tbody>
          ${clientsByCities.map((client, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${client.city}</td>
              <td>${client.name}</td>
              <td>${client.phone}</td>
              ${includePreviousBalance ? `<td class="pending">Rs ${client.currentBalance.toLocaleString()}</td>` : ''}
              <td><div class="recovery-input"></div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;

    openPrintWindow(generateBrandedPrintPage({ title: "Recovery List", subtitle: citiesTitle, tableHtml, paperSize }));
    setIsPrintDialogOpen(false);
    setSelectedCities([]);
    setSortedCities([]);
  };

  // Calculate totals
  const totalRecovery = useMemo(() => {
    return recoveries.reduce((sum, r) => sum + r.amount, 0);
  }, [recoveries]);

  const cityRecoveryTotal = useMemo(() => {
    return cityClientRecoveries.reduce(
      (sum, c) => sum + (parseFloat(c.recoveryAmount) || 0),
      0
    );
  }, [cityClientRecoveries]);

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
          <h2 className="text-2xl font-bold text-foreground">Recovery</h2>
          <p className="text-muted-foreground">Manage client payments and recoveries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            exportToCSV(
              recoveries,
              [
                { key: "clientName", header: "Client", format: (v: any) => v || "N/A" },
                { key: "city", header: "City", format: (v: any) => v || "N/A" },
                { key: "amount", header: "Amount" },
                { key: "type", header: "Type" },
                { key: "date", header: "Date", format: (v: any) => v instanceof Date ? v.toLocaleDateString() : new Date(v).toLocaleDateString() },
                { key: "notes", header: "Notes", format: (v: any) => v || "" },
              ],
              "recoveries"
            );
          }}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          {drafts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 relative"
              onClick={() => setIsDraftsDialogOpen(true)}
            >
              <FileText className="w-4 h-4" />
              Drafts
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {drafts.length}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsPrintDialogOpen(true)}
          >
            <Printer className="w-4 h-4" />
            Print by City
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setIsAddRecoveryOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Recovery
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recovered</p>
              <p className="text-2xl font-bold text-foreground">
                Rs {totalRecovery.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <User className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Recoveries</p>
              <p className="text-2xl font-bold text-foreground">
                {recoveries.filter((r) => r.type === "client").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City Recoveries</p>
              <p className="text-2xl font-bold text-foreground">
                {recoveries.filter((r) => r.type === "city").length}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Date Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2", selectedDate && "text-primary")}>
              <CalendarIcon className="w-4 h-4" />
              {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
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
      </motion.div>

      {/* Recoveries Table / Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <Tabs defaultValue="all" className="w-full">
          <div className="border-b px-4 pt-4 overflow-x-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="client">By Client</TabsTrigger>
              <TabsTrigger value="city">By City</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            {/* Desktop Table */}
            <table className="data-table hidden sm:table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Client / City</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecoveries.map((recovery) => (
                  <tr key={recovery.id}>
                    <td className="whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span>{format(recovery.date, "dd MMM yyyy")}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "status-badge",
                          recovery.type === "client"
                            ? "status-badge-success"
                            : "status-badge-warning"
                        )}
                      >
                        {recovery.type === "client" ? "Client" : "City"}
                      </span>
                    </td>
                    <td className="font-medium">
                      {recovery.type === "client" ? recovery.clientName : recovery.city}
                      {recovery.type === "city" && recovery.clientAmounts && (
                        <p className="text-xs text-muted-foreground">
                          {recovery.clientAmounts.length} clients
                        </p>
                      )}
                    </td>
                    <td className="font-semibold text-success">
                      Rs {recovery.amount.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground">{recovery.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y">
              {filteredRecoveries.map((recovery) => (
                <div key={recovery.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                        recovery.type === "client" ? "bg-success/10" : "bg-warning/10"
                      )}>
                        {recovery.type === "client" 
                          ? <User className="w-4 h-4 text-success" /> 
                          : <MapPin className="w-4 h-4 text-warning" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {recovery.type === "client" ? recovery.clientName : recovery.city}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(recovery.date, "dd MMM yyyy")}
                          {recovery.type === "city" && recovery.clientAmounts && ` • ${recovery.clientAmounts.length} clients`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-success whitespace-nowrap">
                      Rs {recovery.amount.toLocaleString()}
                    </span>
                  </div>
                  {recovery.notes && (
                    <p className="text-xs text-muted-foreground pl-12 truncate">{recovery.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {filteredRecoveries.length === 0 && (
              <div className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No recoveries found
                </h3>
                <p className="text-muted-foreground">
                  Add your first recovery to get started.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="client" className="m-0">
            {/* Desktop */}
            <table className="data-table hidden sm:table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecoveries
                  .filter((r) => r.type === "client")
                  .map((recovery) => (
                    <tr key={recovery.id}>
                      <td className="whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <CalendarIcon className="w-4 h-4 shrink-0" />
                          <span>{format(recovery.date, "dd MMM yyyy")}</span>
                        </div>
                      </td>
                      <td className="font-medium">{recovery.clientName}</td>
                      <td className="font-semibold text-success">
                        Rs {recovery.amount.toLocaleString()}
                      </td>
                      <td className="text-muted-foreground">{recovery.notes || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* Mobile */}
            <div className="sm:hidden divide-y">
              {filteredRecoveries.filter((r) => r.type === "client").map((recovery) => (
                <div key={recovery.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{recovery.clientName}</p>
                    <p className="text-xs text-muted-foreground">{format(recovery.date, "dd MMM yyyy")}</p>
                    {recovery.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{recovery.notes}</p>}
                  </div>
                  <span className="font-bold text-success whitespace-nowrap">Rs {recovery.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="city" className="m-0">
            {/* Desktop */}
            <table className="data-table hidden sm:table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>City</th>
                  <th>Clients</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecoveries
                  .filter((r) => r.type === "city")
                  .map((recovery) => (
                    <tr key={recovery.id}>
                      <td className="whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <CalendarIcon className="w-4 h-4 shrink-0" />
                          <span>{format(recovery.date, "dd MMM yyyy")}</span>
                        </div>
                      </td>
                      <td className="font-medium">{recovery.city}</td>
                      <td>
                        {recovery.clientAmounts && (
                          <div className="text-xs space-y-1">
                            {recovery.clientAmounts.map((ca, idx) => (
                              <div key={idx} className="text-muted-foreground">
                                {ca.clientName}: Rs {ca.amount.toLocaleString()}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="font-semibold text-success">
                        Rs {recovery.amount.toLocaleString()}
                      </td>
                      <td className="text-muted-foreground">{recovery.notes || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* Mobile */}
            <div className="sm:hidden divide-y">
              {filteredRecoveries.filter((r) => r.type === "city").map((recovery) => (
                <div key={recovery.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{recovery.city}</p>
                      <p className="text-xs text-muted-foreground">{format(recovery.date, "dd MMM yyyy")}</p>
                    </div>
                    <span className="font-bold text-success whitespace-nowrap">Rs {recovery.amount.toLocaleString()}</span>
                  </div>
                  {recovery.clientAmounts && recovery.clientAmounts.length > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 space-y-0.5">
                      {recovery.clientAmounts.map((ca, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{ca.clientName}</span>
                          <span>Rs {ca.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Add Recovery Dialog - with category selection */}
      <Dialog open={isAddRecoveryOpen} onOpenChange={setIsAddRecoveryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recovery</DialogTitle>
            <DialogDescription>
              Select the recovery category and enter the details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Recovery Category</Label>
              <Select value={recoveryCategory} onValueChange={(v) => setRecoveryCategory(v as "client" | "city")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Client Recovery
                    </div>
                  </SelectItem>
                  <SelectItem value="city">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      City Recovery
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recoveryCategory === "client" ? (
              <>
                <div className="space-y-2">
                  <Label>Search & Select Client</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {clientRecovery.clientName || "Select a client..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name, phone, city..." />
                        <CommandList>
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.phone} ${client.city}`}
                                onSelect={() => handleSelectClient(client)}
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{client.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {client.phone} • {client.city} • Balance: Rs{" "}
                                    {client.currentBalance.toLocaleString()}
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
                <div className="space-y-2">
                  <Label>Amount (Rs)</Label>
                  <Input
                    type="number"
                    value={clientRecovery.amount}
                    onChange={(e) =>
                      setClientRecovery({ ...clientRecovery, amount: e.target.value })
                    }
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={clientRecovery.accountId || "cash"} onValueChange={(v) => setClientRecovery({ ...clientRecovery, accountId: v === "cash" ? "" : v })}>
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
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={clientRecovery.notes}
                    onChange={(e) =>
                      setClientRecovery({ ...clientRecovery, notes: e.target.value })
                    }
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select City</Label>
                    <Select value={cityRecoveryCity} onValueChange={handleCityChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.city} value={c.city}>
                            {c.city} ({c.clientCount} clients)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recovery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(cityRecoveryDate, "dd MMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={cityRecoveryDate}
                          onSelect={handleCityRecoveryDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {loadingCityClients && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading clients...</span>
                  </div>
                )}

                {!loadingCityClients && cityClientRecoveries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Label>Client Recoveries</Label>
                        {activeDraftId && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                            Draft active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative w-48">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search clients..."
                            value={cityClientSearch}
                            onChange={(e) => setCityClientSearch(e.target.value)}
                            className="pl-8 h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile-friendly cards for small screens, table for larger */}
                    <div className="border rounded-lg overflow-hidden">
                      {/* Desktop Table */}
                      <table className="data-table hidden sm:table">
                        <thead>
                          <tr>
                            <th className="w-10">✓</th>
                            <th>Client</th>
                            <th>Phone</th>
                            <th>Pending Balance</th>
                            <th>Account</th>
                            <th>Recovery Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCityClients.map((client) => (
                            <tr 
                              key={client.clientId}
                              className={cn(client.isCollected && "bg-success/5")}
                            >
                              <td>
                                <button
                                  type="button"
                                  onClick={() => toggleClientCollected(client.clientId)}
                                  className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                    client.isCollected
                                      ? "bg-success border-success text-white"
                                      : "border-muted-foreground/30 hover:border-success"
                                  )}
                                >
                                  {client.isCollected && <Check className="w-4 h-4" />}
                                </button>
                              </td>
                              <td className={cn("font-medium", client.isCollected && "text-muted-foreground line-through")}>
                                {client.clientName}
                              </td>
                              <td className="text-muted-foreground text-sm">{client.phone}</td>
                              <td className="text-destructive font-medium">
                                Rs {client.currentBalance.toLocaleString()}
                              </td>
                              <td>
                                <Select value={client.accountId || "cash"} onValueChange={(v) => updateClientAccountId(client.clientId, v)}>
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    {paymentAccounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td>
                                <Input
                                  type="number"
                                  value={client.recoveryAmount}
                                  onChange={(e) =>
                                    updateClientRecoveryAmount(client.clientId, e.target.value)
                                  }
                                  placeholder="0"
                                  className="h-8 w-32"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Mobile Cards */}
                      <div className="sm:hidden divide-y">
                        {filteredCityClients.map((client) => (
                          <div 
                            key={client.clientId}
                            className={cn(
                              "p-3 flex items-start gap-3",
                              client.isCollected && "bg-success/5"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleClientCollected(client.clientId)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-1",
                                client.isCollected
                                  ? "bg-success border-success text-white"
                                  : "border-muted-foreground/30 hover:border-success"
                              )}
                            >
                              {client.isCollected && <Check className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "font-medium text-sm",
                                client.isCollected && "text-muted-foreground line-through"
                              )}>
                                {client.clientName}
                              </div>
                              <div className="text-xs text-muted-foreground">{client.phone}</div>
                              <div className="text-sm text-destructive font-medium mt-1">
                                Balance: Rs {client.currentBalance.toLocaleString()}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Select value={client.accountId || "cash"} onValueChange={(v) => updateClientAccountId(client.clientId, v)}>
                                  <SelectTrigger className="h-10 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    {paymentAccounts.map((acc) => (
                                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  value={client.recoveryAmount}
                                  onChange={(e) =>
                                    updateClientRecoveryAmount(client.clientId, e.target.value)
                                  }
                                  placeholder="Amount"
                                  className="h-10 flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {cityClientRecoveries.filter(c => c.isCollected).length}
                        </span>
                        {" "}of {cityClientRecoveries.length} collected
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Recovery</p>
                        <p className="text-xl font-bold text-success">
                          Rs {cityRecoveryTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={cityRecoveryNotes}
                    onChange={(e) => setCityRecoveryNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsAddRecoveryOpen(false)}>
                Cancel
              </Button>
              {recoveryCategory === "city" && cityClientRecoveries.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowAddRecoveryConfirm(true)}
              disabled={
                recoveryCategory === "client"
                  ? !clientRecovery.clientId || !clientRecovery.amount
                  : cityRecoveryTotal === 0
              }
              className="w-full sm:w-auto"
            >
              Add Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print by City Dialog with drag-and-drop sorting */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Print Recovery List by Cities</DialogTitle>
            <DialogDescription>
              Select cities and drag to reorder. Toggle to include/exclude previous balances.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Cities</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {cities.map((c) => (
                  <div
                    key={c.city}
                    onClick={() => toggleCity(c.city)}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                      selectedCities.includes(c.city)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.city}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.clientCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sortedCities.length > 0 && (
              <div className="space-y-2">
                <Label>City Order (drag to reorder)</Label>
                <div className="space-y-1 border rounded-lg p-2">
                  {sortedCities.map((sc, index) => (
                    <div
                      key={sc.city}
                      draggable
                      onDragStart={() => handleDragStart(sc.city)}
                      onDragOver={(e) => handleDragOver(e, sc.city)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors",
                        draggedCity === sc.city
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{index + 1}. {sc.city}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {sc.clientCount} clients
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeBalance"
                checked={includePreviousBalance}
                onCheckedChange={(checked) => setIncludePreviousBalance(checked as boolean)}
              />
              <label
                htmlFor="includeBalance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include previous balance column
              </label>
            </div>

            {selectedCities.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  This will print a list of {clientsByCities.length} clients in{" "}
                  <span className="font-medium text-foreground">
                    {sortedCities.map((sc) => sc.city).join(" → ")}
                  </span>{" "}
                  order.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPrintDialogOpen(false);
                setSelectedCities([]);
                setSortedCities([]);
              }}
            >
              Cancel
            </Button>
            <PrintButton
              docType="recoveryList"
              onPrint={handlePrintRecoveryList}
              disabled={selectedCities.length === 0}
              label="Print List"
              variant="default"
              size="default"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drafts Dialog */}
      <Dialog open={isDraftsDialogOpen} onOpenChange={setIsDraftsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Saved Drafts
            </DialogTitle>
            <DialogDescription>
              Resume your saved recovery progress. Drafts are stored locally on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No drafts saved</p>
              </div>
            ) : (
              drafts.map((draft) => {
                const collectedCount = draft.clients.filter(c => c.isCollected).length;
                const withAmountCount = draft.clients.filter(c => parseFloat(c.recoveryAmount) > 0).length;
                const totalAmount = draft.clients.reduce(
                  (sum, c) => sum + (parseFloat(c.recoveryAmount) || 0),
                  0
                );
                
                return (
                  <div
                    key={draft.id}
                    className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{draft.city}</span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {format(new Date(draft.date), "dd MMM yyyy")}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span>{collectedCount} of {draft.clients.length} visited</span>
                          </div>
                          {withAmountCount > 0 && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3 h-3" />
                              <span>Rs {totalAmount.toLocaleString()} from {withAmountCount} clients</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Last saved: {format(new Date(draft.updatedAt), "dd MMM, HH:mm")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={() => handleResumeDraft(draft)}
                        >
                          <Play className="w-3 h-3" />
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDraftToDelete(draft.id);
                            setShowDeleteDraftConfirm(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDraftsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Draft Confirmation */}
      <AlertDialog open={showDeleteDraftConfirm} onOpenChange={setShowDeleteDraftConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDraftToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => draftToDelete && handleDeleteDraft(draftToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={showAddRecoveryConfirm}
        onOpenChange={setShowAddRecoveryConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add {recoveryCategory === "client" ? "Client" : "City"} Recovery</AlertDialogTitle>
            <AlertDialogDescription>
              {recoveryCategory === "client" ? (
                <>
                  Are you sure you want to add a recovery of Rs{" "}
                  {parseFloat(clientRecovery.amount || "0").toLocaleString()} for{" "}
                  {clientRecovery.clientName}?
                </>
              ) : (
                <>
                  Are you sure you want to add a total recovery of Rs{" "}
                  {cityRecoveryTotal.toLocaleString()} for{" "}
                  {cityClientRecoveries.filter((c) => parseFloat(c.recoveryAmount) > 0).length}{" "}
                  clients in {cityRecoveryCity}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddRecovery} disabled={isSavingRecovery}>
              {isSavingRecovery ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Add Recovery"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecoveryPage;
