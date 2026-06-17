import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, User, MapPin } from "lucide-react";
import { generatePaymentReceiptHTML } from "@/utils/printUtils";
import { getPrintDefault } from "@/utils/printPreferences";
import { useAutoPrintModalPrompt } from "@/context/AutoPrintModalContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";

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

interface CityClient {
  clientId: string;
  clientName: string;
  phone: string;
  currentBalance: number;
  amount: string;
  accountId: string;
}

interface QuickRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickRecoveryDialog({ open, onOpenChange }: QuickRecoveryDialogProps) {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const promptAutoPrint = useAutoPrintModalPrompt();
  const [mode, setMode] = useState<"individual" | "city">("individual");
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Individual form
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    notes: "",
    accountId: "",
  });

  // City form
  const [selectedCity, setSelectedCity] = useState("");
  const [cityClients, setCityClients] = useState<CityClient[]>([]);
  const [cityNotes, setCityNotes] = useState("");

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    const [clientsRes, accountsRes] = await Promise.all([
      supabase.from("clients").select("id, name, phone, city, current_balance").order("name"),
      supabase.from("payment_accounts").select("*").order("name"),
    ]);
    setClients(
      (clientsRes.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        city: c.city || "Unknown",
        currentBalance: c.current_balance,
      }))
    );
    setPaymentAccounts((accountsRes.data || []).map((a) => ({ id: a.id, name: a.name })));
  };

  const cities = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach((c) => {
      if (c.city && c.city !== "Unknown") map.set(c.city, (map.get(c.city) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, clientCount: count }))
      .sort((a, b) => a.city.localeCompare(b.city));
  }, [clients]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const cityClientsList = clients
      .filter((c) => c.city === city)
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        phone: c.phone,
        currentBalance: c.currentBalance,
        amount: "",
        accountId: "",
      }));
    setCityClients(cityClientsList);
  };

  const updateCityClientAmount = (clientId: string, amount: string) => {
    setCityClients((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, amount } : c))
    );
  };

  const updateCityClientAccount = (clientId: string, accountId: string) => {
    setCityClients((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, accountId: accountId === "cash" ? "" : accountId } : c))
    );
  };

  const cityTotal = useMemo(
    () => cityClients.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
    [cityClients]
  );

  const handleSelectClient = (client: Client) => {
    setForm({ ...form, clientId: client.id, clientName: client.name });
    setClientSearchOpen(false);
  };

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", amount: "", notes: "", accountId: "" });
    setSelectedCity("");
    setCityClients([]);
    setCityNotes("");
    setMode("individual");
  };

  const handleSubmitIndividual = async () => {
    if (!form.clientId || !form.amount) {
      toast({ title: "Missing fields", description: "Please select a client and enter an amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      const insertData: any = { client_id: form.clientId, amount, notes: form.notes || null, type: "client" };
      if (form.accountId) insertData.account_id = form.accountId;

      const { error } = await supabase.from("recoveries").insert(insertData);
      if (error) throw error;

      const client = clients.find((c) => c.id === form.clientId);
      if (client) {
        await supabase.from("clients").update({ current_balance: client.currentBalance - amount }).eq("id", form.clientId);
      }

      await log({ action: "create", entityType: "recovery", entityId: form.clientId, details: { clientName: form.clientName, amount, type: "client" } });
      toast({ title: "Success", description: `Recovery of Rs ${amount.toLocaleString()} added for ${form.clientName}` });

      // Close the recovery dialog first so the print modal sits cleanly on top.
      resetForm();
      onOpenChange(false);

      // Auto-print payment receipt prompt (individual recoveries only).
      const acctName = form.accountId
        ? (paymentAccounts.find((a) => a.id === form.accountId)?.name || null)
        : "Cash";
      const receiptHtml = generatePaymentReceiptHTML({
        clientName: form.clientName,
        amount,
        account: acctName,
        notes: form.notes || null,
        paperSize: getPrintDefault("paymentReceipt"),
        previousBalance: clients.find((c) => c.id === form.clientId)?.currentBalance,
      });
      promptAutoPrint(
        "paymentReceipt",
        "Recovery saved",
        `Rs ${amount.toLocaleString()} • ${form.clientName}`,
        () => receiptHtml,
      );
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add recovery", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCity = async () => {
    const activeClients = cityClients.filter((c) => parseFloat(c.amount) > 0);
    if (!selectedCity || activeClients.length === 0) {
      toast({ title: "Missing fields", description: "Select a city and enter at least one client amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Create main recovery record
      const { data: recoveryResult, error: recoveryError } = await supabase
        .from("recoveries")
        .insert({ city: selectedCity, amount: cityTotal, notes: cityNotes || null, type: "city" })
        .select()
        .single();
      if (recoveryError) throw recoveryError;

      // Insert client amounts
      const amountInserts = activeClients.map((c) => ({
        recovery_id: recoveryResult.id,
        client_id: c.clientId,
        amount: parseFloat(c.amount),
        ...(c.accountId ? { account_id: c.accountId } : {}),
      }));
      const { error: amountsError } = await supabase.from("recovery_client_amounts").insert(amountInserts);
      if (amountsError) throw amountsError;

      // Update client balances
      for (const c of activeClients) {
        const client = clients.find((cl) => cl.id === c.clientId);
        if (client) {
          await supabase.from("clients").update({ current_balance: client.currentBalance - parseFloat(c.amount) }).eq("id", c.clientId);
        }
      }

      await log({ action: "create", entityType: "recovery", entityId: recoveryResult.id, details: { type: "city", city: selectedCity, amount: cityTotal, clients: activeClients.length } });
      toast({ title: "Success", description: `City recovery of Rs ${cityTotal.toLocaleString()} added for ${selectedCity} (${activeClients.length} clients)` });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add city recovery", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = mode === "individual"
    ? form.clientId && form.amount
    : selectedCity && cityClients.some((c) => parseFloat(c.amount) > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Recovery</DialogTitle>
          <DialogDescription>Record a recovery payment.</DialogDescription>
        </DialogHeader>

        {/* Toggle */}
        <div className="flex rounded-lg border border-border p-1 bg-muted/30">
          <button
            onClick={() => setMode("individual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
              mode === "individual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="w-4 h-4" />
            Individual
          </button>
          <button
            onClick={() => setMode("city")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
              mode === "city" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="w-4 h-4" />
            City
          </button>
        </div>

        <div className="grid gap-4 py-2">
          {mode === "individual" ? (
            <>
              <div className="space-y-2">
                <Label>Search & Select Client</Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {form.clientName || "Select a client..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
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
                                  {client.phone} • {client.city} • Balance: Rs {client.currentBalance.toLocaleString()}
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
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount" />
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={form.accountId || "cash"} onValueChange={(v) => setForm({ ...form, accountId: v === "cash" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    {paymentAccounts.map((acc) => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any notes..." rows={2} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select City</Label>
                <Select value={selectedCity} onValueChange={handleCityChange}>
                  <SelectTrigger><SelectValue placeholder="Choose a city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.city} value={c.city}>{c.city} ({c.clientCount} clients)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {cityClients.length > 0 && (
                <div className="space-y-2">
                  <Label>Client Recoveries</Label>
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {cityClients.map((client) => (
                      <div key={client.clientId} className="flex items-center gap-2 p-2 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.clientName}</p>
                          <p className="text-xs text-muted-foreground">{client.phone} • Rs {client.currentBalance.toLocaleString()}</p>
                        </div>
                        <Select value={client.accountId || "cash"} onValueChange={(v) => updateCityClientAccount(client.clientId, v)}>
                          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            {paymentAccounts.map((acc) => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={client.amount}
                          onChange={(e) => updateCityClientAmount(client.clientId, e.target.value)}
                          placeholder="0"
                          className="h-8 w-24"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {cityClients.filter((c) => parseFloat(c.amount) > 0).length} of {cityClients.length} entered
                    </span>
                    <span className="text-sm font-bold text-success">Total: Rs {cityTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea value={cityNotes} onChange={(e) => setCityNotes(e.target.value)} placeholder="Add any notes..." rows={2} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button
            onClick={mode === "individual" ? handleSubmitIndividual : handleSubmitCity}
            disabled={saving || !canSubmit}
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Add Recovery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
