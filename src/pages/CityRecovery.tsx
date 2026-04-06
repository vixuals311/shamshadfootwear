import { useState, useMemo, useEffect, useCallback } from "react";
import { generateBrandedPrintPage, openPrintWindow } from "@/utils/printUtils";
import { motion } from "framer-motion";
import {
  Search, Printer, MapPin, Calendar as CalendarIcon,
  GripVertical, Loader2, Save, FileText, Trash2,
  Check, CheckCircle2, Play, Phone, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useRecoveryDrafts, DraftClientRecovery, RecoveryDraft } from "@/hooks/useRecoveryDrafts";
import { addToSyncQueue, updateCachedRecord } from "@/lib/offlineDb";
import { useIsMobile } from "@/hooks/use-mobile";

interface Client {
  id: string;
  name: string;
  phone: string;
  city: string;
  currentBalance: number;
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

const isNetworkError = (error: any): boolean => {
  const msg = error?.message || String(error);
  return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('TypeError') || msg.includes('Load failed');
};

const CityRecoveryPage = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const isMobile = useIsMobile();
  const { drafts, saveDraft, deleteDraft, getDraftForCityDate } = useRecoveryDrafts();

  const [clients, setClients] = useState<Client[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Entry state
  const [cityRecoveryCity, setCityRecoveryCity] = useState("");
  const [cityRecoveryNotes, setCityRecoveryNotes] = useState("");
  const [cityRecoveryDate, setCityRecoveryDate] = useState<Date>(new Date());
  const [cityClientRecoveries, setCityClientRecoveries] = useState<CityClientRecovery[]>([]);
  const [cityClientSearch, setCityClientSearch] = useState("");
  const [loadingCityClients, setLoadingCityClients] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  // Print state
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortedCities, setSortedCities] = useState<SortableCityItem[]>([]);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [draggedCity, setDraggedCity] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [{ data: clientsData }, { data: accountsData }] = await Promise.all([
          supabase.from("clients").select("id, name, phone, city, current_balance").order("name"),
          supabase.from("payment_accounts").select("*").order("name"),
        ]);
        setClients((clientsData || []).map(c => ({
          id: c.id, name: c.name, phone: c.phone || "",
          city: c.city || "Unknown", currentBalance: c.current_balance || 0,
        })));
        setPaymentAccounts((accountsData || []).map(a => ({ id: a.id, name: a.name })));
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cities list
  const cities = useMemo(() => {
    const unique = [...new Set(clients.map(c => c.city).filter(Boolean))];
    return unique.map(city => ({
      city,
      clientCount: clients.filter(c => c.city === city).length,
    }));
  }, [clients]);

  // --- ENTRY TAB LOGIC ---
  const loadCityClients = async (city: string, date: Date) => {
    setLoadingCityClients(true);
    try {
      const cityClients = clients.filter(c => c.city === city);
      const existingDraft = getDraftForCityDate(city, date);

      const balances: CityClientRecovery[] = cityClients.map(client => {
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
      setCityClientRecoveries(balances);
    } finally {
      setLoadingCityClients(false);
    }
  };

  const handleCityChange = (city: string) => {
    setCityRecoveryCity(city);
    loadCityClients(city, cityRecoveryDate);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setCityRecoveryDate(date);
    if (cityRecoveryCity) loadCityClients(cityRecoveryCity, date);
  };

  const handleResumeDraft = (draft: RecoveryDraft) => {
    setCityRecoveryCity(draft.city);
    setCityRecoveryDate(new Date(draft.date));
    setCityRecoveryNotes(draft.notes);
    setActiveDraftId(draft.id);
    setCityClientRecoveries(draft.clients.map(c => ({
      clientId: c.clientId, clientName: c.clientName, phone: c.phone,
      currentBalance: c.currentBalance, recoveryAmount: c.recoveryAmount,
      isCollected: c.isCollected,
    })));
    toast({ title: "Draft loaded", description: `Resumed ${draft.city} recovery` });
  };

  const handleSaveDraft = () => {
    if (!cityRecoveryCity) {
      toast({ title: "Select a city first", variant: "destructive" });
      return;
    }
    const draftClients: DraftClientRecovery[] = cityClientRecoveries.map(c => ({
      clientId: c.clientId, clientName: c.clientName, phone: c.phone,
      currentBalance: c.currentBalance, recoveryAmount: c.recoveryAmount,
      isCollected: c.isCollected || false,
    }));
    const saved = saveDraft({
      city: cityRecoveryCity,
      date: cityRecoveryDate.toISOString(),
      notes: cityRecoveryNotes,
      clients: draftClients,
    });
    if (saved) setActiveDraftId(saved.id);
    toast({ title: "Draft saved", description: `Progress saved for ${cityRecoveryCity}` });
  };

  const toggleClientCollected = (clientId: string) => {
    setCityClientRecoveries(prev =>
      prev.map(c => c.clientId === clientId ? { ...c, isCollected: !c.isCollected } : c)
    );
  };

  const updateClientAmount = (clientId: string, amount: string) => {
    setCityClientRecoveries(prev =>
      prev.map(c => c.clientId === clientId ? { ...c, recoveryAmount: amount } : c)
    );
  };

  const updateClientAccount = (clientId: string, accountId: string) => {
    setCityClientRecoveries(prev =>
      prev.map(c => c.clientId === clientId ? { ...c, accountId: accountId === "cash" ? "" : accountId } : c)
    );
  };

  const filteredCityClients = useMemo(() => {
    if (!cityClientSearch.trim()) return cityClientRecoveries;
    const s = cityClientSearch.toLowerCase();
    return cityClientRecoveries.filter(c =>
      c.clientName.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [cityClientRecoveries, cityClientSearch]);

  const cityRecoveryTotal = useMemo(() => {
    return cityClientRecoveries.reduce((sum, c) => sum + (parseFloat(c.recoveryAmount) || 0), 0);
  }, [cityClientRecoveries]);

  const handleSubmitRecovery = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const clientAmounts = cityClientRecoveries.filter(c => parseFloat(c.recoveryAmount) > 0);
      const totalAmount = clientAmounts.reduce((sum, c) => sum + parseFloat(c.recoveryAmount), 0);
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
          .select().single();
        if (recoveryError) throw recoveryError;

        const inserts = clientAmounts.map(ca => ({
          recovery_id: recoveryResult.id,
          client_id: ca.clientId,
          amount: parseFloat(ca.recoveryAmount),
          ...(ca.accountId ? { account_id: ca.accountId } : {}),
        }));
        const { error: amountsError } = await supabase.from("recovery_client_amounts").insert(inserts);
        if (amountsError) throw amountsError;

        for (const ca of clientAmounts) {
          const client = clients.find(c => c.id === ca.clientId);
          if (client) {
            await supabase.from("clients").update({
              current_balance: client.currentBalance - parseFloat(ca.recoveryAmount),
            }).eq("id", ca.clientId);
          }
        }

        try {
          await log({
            action: "create", entityType: "recovery", entityId: recoveryResult.id,
            details: { type: "city", city: cityRecoveryCity, amount: totalAmount, clients: clientAmounts.length },
          });
        } catch {}
        onlineSaved = true;
      } catch (netErr: any) {
        if (!isNetworkError(netErr)) throw netErr;
        const offlineId = crypto.randomUUID();
        const consolidated = {
          recovery: {
            id: offlineId, city: cityRecoveryCity, amount: totalAmount,
            notes: cityRecoveryNotes || null, type: "city",
            date: format(cityRecoveryDate, "yyyy-MM-dd"),
          },
          clientAmounts: clientAmounts.map(ca => ({ client_id: ca.clientId, amount: parseFloat(ca.recoveryAmount) })),
          clientBalanceUpdates: clientAmounts.map(ca => {
            const client = clients.find(c => c.id === ca.clientId);
            return { client_id: ca.clientId, new_balance: client ? client.currentBalance - parseFloat(ca.recoveryAmount) : 0 };
          }),
        };
        await addToSyncQueue({ table: "city_recovery", operation: "insert", data: consolidated });
        await updateCachedRecord("recoveries", offlineId, consolidated.recovery);
        for (const u of consolidated.clientBalanceUpdates) {
          const client = clients.find(c => c.id === u.client_id);
          if (client) await updateCachedRecord("clients", u.client_id, { ...client, current_balance: u.new_balance });
        }
      }

      toast({
        title: onlineSaved ? "Success" : "Queued for sync",
        description: onlineSaved ? `City recovery of Rs ${totalAmount.toLocaleString()} added` : "Recovery saved offline.",
      });

      if (activeDraftId) { deleteDraft(activeDraftId); setActiveDraftId(null); }
      setCityRecoveryCity("");
      setCityRecoveryNotes("");
      setCityRecoveryDate(new Date());
      setCityClientRecoveries([]);
      setShowConfirm(false);

      // Refresh client balances
      const { data: freshClients } = await supabase.from("clients").select("id, name, phone, city, current_balance").order("name");
      if (freshClients) {
        setClients(freshClients.map(c => ({
          id: c.id, name: c.name, phone: c.phone || "",
          city: c.city || "Unknown", currentBalance: c.current_balance || 0,
        })));
      }
    } catch (error: any) {
      if (isNetworkError(error)) {
        setShowConfirm(false);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to add recovery", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- PRINT TAB LOGIC ---
  useEffect(() => {
    const newSelected = cities.filter(c => selectedCities.includes(c.city));
    const existing = sortedCities.filter(sc => selectedCities.includes(sc.city));
    const added = newSelected.filter(nc => !existing.some(sc => sc.city === nc.city));
    setSortedCities([...existing, ...added]);
  }, [selectedCities, cities]);

  const clientsByCities = useMemo(() => {
    if (sortedCities.length === 0) return [];
    const order = sortedCities.map(sc => sc.city);
    return clients
      .filter(c => selectedCities.includes(c.city))
      .sort((a, b) => {
        const ai = order.indexOf(a.city);
        const bi = order.indexOf(b.city);
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name);
      });
  }, [clients, selectedCities, sortedCities]);

  const toggleCity = (city: string) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const handleDragStart = (city: string) => setDraggedCity(city);
  const handleDragOver = (e: React.DragEvent, targetCity: string) => {
    e.preventDefault();
    if (!draggedCity || draggedCity === targetCity) return;
    setSortedCities(prev => {
      const di = prev.findIndex(c => c.city === draggedCity);
      const ti = prev.findIndex(c => c.city === targetCity);
      if (di === -1 || ti === -1) return prev;
      const n = [...prev]; const [d] = n.splice(di, 1); n.splice(ti, 0, d); return n;
    });
  };
  const handleDragEnd = () => setDraggedCity(null);

  const handlePrint = () => {
    if (selectedCities.length === 0) return;
    const cityOrder = sortedCities.map(sc => sc.city);
    const citiesTitle = cityOrder.join(", ");
    const tableHtml = `<table><thead><tr>
      <th>#</th><th>City</th><th>Client Name</th><th>Phone</th>
      ${includePreviousBalance ? '<th>Pending Balance</th>' : ''}
      <th class="amount-col">Recovery Amount</th>
    </tr></thead><tbody>
    ${clientsByCities.map((client, i) => `<tr>
      <td>${i + 1}</td><td>${client.city}</td><td>${client.name}</td><td>${client.phone}</td>
      ${includePreviousBalance ? `<td class="pending">Rs ${client.currentBalance.toLocaleString()}</td>` : ''}
      <td><div class="recovery-input"></div></td>
    </tr>`).join("")}
    </tbody></table>`;
    openPrintWindow(generateBrandedPrintPage({ title: "Recovery List", subtitle: citiesTitle, tableHtml }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          City Recovery
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Enter city recoveries or print recovery lists</p>
      </motion.div>

      <Tabs defaultValue="enter" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="enter" className="gap-2">
            <IndianRupee className="w-4 h-4" />
            Enter Recovery
          </TabsTrigger>
          <TabsTrigger value="print" className="gap-2">
            <Printer className="w-4 h-4" />
            Print List
          </TabsTrigger>
        </TabsList>

        {/* ===== ENTER RECOVERY TAB ===== */}
        <TabsContent value="enter" className="space-y-4 mt-4">
          {/* Drafts section */}
          {drafts.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Saved Drafts ({drafts.length})
              </h3>
              <div className="space-y-2">
                {drafts.map(draft => (
                  <div key={draft.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border/50">
                    <div>
                      <p className="font-medium text-sm">{draft.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(draft.updatedAt), "dd MMM, HH:mm")} · {draft.clients.filter(c => c.recoveryAmount).length} entries
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResumeDraft(draft)}>
                        <Play className="w-3 h-3 mr-1" /> Resume
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                        setDraftToDelete(draft.id);
                        setShowDeleteDraftConfirm(true);
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* City & Date selection */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">City</Label>
                <Select value={cityRecoveryCity} onValueChange={handleCityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => (
                      <SelectItem key={c.city} value={c.city}>
                        {c.city} ({c.clientCount} clients)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(cityRecoveryDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={cityRecoveryDate} onSelect={handleDateChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                value={cityRecoveryNotes}
                onChange={e => setCityRecoveryNotes(e.target.value)}
                placeholder="Any notes for this recovery..."
                className="h-16 resize-none"
              />
            </div>
          </div>

          {/* Client list */}
          {cityRecoveryCity && (
            <div className="bg-card rounded-xl shadow-card border border-border/50">
              {/* Search & actions bar */}
              <div className="p-3 sm:p-4 border-b border-border/50 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={cityClientSearch}
                    onChange={e => setCityClientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleSaveDraft} className="gap-1">
                    <Save className="w-3.5 h-3.5" /> Save Draft
                  </Button>
                </div>
              </div>

              {loadingCityClients ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-3 text-left font-medium text-muted-foreground w-8">✓</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Client</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Phone</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">Balance</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Account</th>
                          <th className="p-3 text-left font-medium text-muted-foreground w-36">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCityClients.map(client => (
                          <tr key={client.clientId} className={cn(
                            "border-b transition-colors",
                            client.isCollected && "bg-success/5",
                            parseFloat(client.recoveryAmount) > 0 && !client.isCollected && "bg-primary/5"
                          )}>
                            <td className="p-3">
                              <Checkbox
                                checked={client.isCollected}
                                onCheckedChange={() => toggleClientCollected(client.clientId)}
                              />
                            </td>
                            <td className="p-3 font-medium">{client.clientName}</td>
                            <td className="p-3 text-muted-foreground">{client.phone}</td>
                            <td className="p-3 text-right font-semibold text-destructive">
                              Rs {client.currentBalance.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Select
                                value={client.accountId || "cash"}
                                onValueChange={v => updateClientAccount(client.clientId, v)}
                              >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  {paymentAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                placeholder="0"
                                value={client.recoveryAmount}
                                onChange={e => updateClientAmount(client.clientId, e.target.value)}
                                className="h-8 w-32"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-border/50">
                    {filteredCityClients.map(client => (
                      <div key={client.clientId} className={cn(
                        "p-3 space-y-2",
                        client.isCollected && "bg-success/5",
                        parseFloat(client.recoveryAmount) > 0 && !client.isCollected && "bg-primary/5"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={client.isCollected}
                              onCheckedChange={() => toggleClientCollected(client.clientId)}
                            />
                            <div>
                              <p className="font-medium text-sm">{client.clientName}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />{client.phone}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-destructive">
                            Rs {client.currentBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2 pl-7">
                          <Select
                            value={client.accountId || "cash"}
                            onValueChange={v => updateClientAccount(client.clientId, v)}
                          >
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              {paymentAccounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={client.recoveryAmount}
                            onChange={e => updateClientAmount(client.clientId, e.target.value)}
                            className="h-8 w-28"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Sticky total & submit */}
              {cityClientRecoveries.length > 0 && (
                <div className="sticky bottom-0 bg-card border-t border-border p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-xl">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {cityClientRecoveries.filter(c => parseFloat(c.recoveryAmount) > 0).length} of {cityClientRecoveries.length} clients
                    </span>
                    <span className="font-bold text-lg text-foreground">
                      Total: Rs {cityRecoveryTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none gap-1" onClick={handleSaveDraft}>
                      <Save className="w-4 h-4" /> Save Draft
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none gap-1"
                      disabled={cityRecoveryTotal === 0}
                      onClick={() => setShowConfirm(true)}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Submit Recovery
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!cityRecoveryCity && (
            <div className="bg-card rounded-xl p-8 sm:p-12 shadow-card border border-border/50 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a city above to start entering recoveries</p>
            </div>
          )}
        </TabsContent>

        {/* ===== PRINT LIST TAB ===== */}
        <TabsContent value="print" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Select Cities</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-balance"
                  checked={includePreviousBalance}
                  onCheckedChange={(v) => setIncludePreviousBalance(!!v)}
                />
                <Label htmlFor="include-balance" className="text-sm cursor-pointer">Include balances</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {cities.map(c => (
                <button
                  key={c.city}
                  onClick={() => toggleCity(c.city)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all",
                    selectedCities.includes(c.city)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="block">{c.city}</span>
                  <span className="text-xs text-muted-foreground">{c.clientCount} clients</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort order */}
          {sortedCities.length > 1 && (
            <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Drag to reorder cities</h3>
              <div className="space-y-1.5">
                {sortedCities.map((sc, i) => (
                  <div
                    key={sc.city}
                    draggable
                    onDragStart={() => handleDragStart(sc.city)}
                    onDragOver={(e) => handleDragOver(e, sc.city)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-colors",
                      draggedCity === sc.city ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{i + 1}. {sc.city}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{sc.clientCount} clients</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview & Print */}
          {selectedCities.length > 0 && (
            <div className="bg-card rounded-xl shadow-card border border-border/50">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Preview ({clientsByCities.length} clients)
                </h3>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" /> Print List
                </Button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50 z-10">
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">City</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Client</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Phone</th>
                      {includePreviousBalance && (
                        <th className="p-3 text-right font-medium text-muted-foreground">Balance</th>
                      )}
                      <th className="p-3 text-left font-medium text-muted-foreground">Recovery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsByCities.map((client, i) => (
                      <tr key={client.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3">{client.city}</td>
                        <td className="p-3 font-medium">{client.name}</td>
                        <td className="p-3 text-muted-foreground">{client.phone}</td>
                        {includePreviousBalance && (
                          <td className="p-3 text-right font-semibold text-destructive">
                            Rs {client.currentBalance.toLocaleString()}
                          </td>
                        )}
                        <td className="p-3 text-muted-foreground italic">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedCities.length === 0 && (
            <div className="bg-card rounded-xl p-8 sm:p-12 shadow-card border border-border/50 text-center">
              <Printer className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select cities above to preview and print recovery lists</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm submit dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit City Recovery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will record recovery of <strong>Rs {cityRecoveryTotal.toLocaleString()}</strong> from{" "}
              <strong>{cityClientRecoveries.filter(c => parseFloat(c.recoveryAmount) > 0).length} clients</strong> in{" "}
              <strong>{cityRecoveryCity}</strong> and update their balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitRecovery} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete draft confirm */}
      <AlertDialog open={showDeleteDraftConfirm} onOpenChange={setShowDeleteDraftConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>This draft will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (draftToDelete) {
                deleteDraft(draftToDelete);
                if (activeDraftId === draftToDelete) setActiveDraftId(null);
                setShowDeleteDraftConfirm(false);
                setDraftToDelete(null);
                toast({ title: "Draft deleted" });
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CityRecoveryPage;
