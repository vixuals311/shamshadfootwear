import { useState, useEffect } from "react";
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

interface QuickRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickRecoveryDialog({ open, onOpenChange }: QuickRecoveryDialogProps) {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const promptAutoPrint = useAutoPrintModalPrompt();
  const [recoveryType, setRecoveryType] = useState<"individual" | "city">("individual");
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    notes: "",
    accountId: "",
  });

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

  const handleSelectClient = (client: Client) => {
    setForm({ ...form, clientId: client.id, clientName: client.name });
    setClientSearchOpen(false);
  };

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", amount: "", notes: "", accountId: "" });
    setRecoveryType("individual");
  };

  const selectedClient = clients.find((c) => c.id === form.clientId) || null;

  const handleSubmit = async () => {
    if (!form.clientId || !form.amount) {
      toast({ title: "Missing fields", description: "Please select a client and enter an amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      const client = selectedClient!;
      const newBalance = client.currentBalance - amount;

      if (recoveryType === "city") {
        const clientCity = client.city && client.city !== "Unknown" ? client.city : null;
        const today = new Date().toISOString().split("T")[0];

        // Find or create today's city recovery for this city
        const { data: existingRecovery } = await supabase
          .from("recoveries")
          .select("id, amount")
          .eq("type", "city")
          .eq("city", clientCity || "")
          .eq("date", today)
          .maybeSingle();

        let recoveryId: string;
        if (existingRecovery) {
          recoveryId = existingRecovery.id;
          await supabase
            .from("recoveries")
            .update({ amount: existingRecovery.amount + amount })
            .eq("id", recoveryId);
        } else {
          const { data: newRecovery, error: recError } = await supabase
            .from("recoveries")
            .insert({
              amount,
              type: "city",
              city: clientCity,
              notes: form.notes || null,
              date: today,
            })
            .select()
            .single();
          if (recError) throw recError;
          recoveryId = newRecovery.id;
        }

        const rcaData: any = {
          recovery_id: recoveryId,
          client_id: client.id,
          amount,
        };
        if (form.accountId) rcaData.account_id = form.accountId;
        const { error: rcaError } = await supabase
          .from("recovery_client_amounts")
          .insert(rcaData);
        if (rcaError) throw rcaError;

        await supabase.from("clients").update({ current_balance: newBalance }).eq("id", client.id);
      } else {
        const insertData: any = { client_id: form.clientId, amount, notes: form.notes || null, type: "client" };
        if (form.accountId) insertData.account_id = form.accountId;
        const { error } = await supabase.from("recoveries").insert(insertData);
        if (error) throw error;
        await supabase.from("clients").update({ current_balance: newBalance }).eq("id", form.clientId);
      }

      await log({ action: "create", entityType: "recovery", entityId: form.clientId, details: { clientName: form.clientName, amount, type: recoveryType } });
      toast({ title: "Success", description: `${recoveryType === "city" ? "City" : "Individual"} recovery of Rs ${amount.toLocaleString()} added for ${form.clientName}` });

      // Close the recovery dialog first so the print modal sits cleanly on top.
      const previousBalance = client.currentBalance;
      const remainingBalance = newBalance;
      const clientNameSnapshot = form.clientName;
      const notesSnapshot = form.notes;
      const accountIdSnapshot = form.accountId;
      resetForm();
      onOpenChange(false);

      // Auto-print payment receipt prompt.
      const acctName = accountIdSnapshot
        ? (paymentAccounts.find((a) => a.id === accountIdSnapshot)?.name || null)
        : "Cash";
      const receiptHtml = generatePaymentReceiptHTML({
        clientName: clientNameSnapshot,
        amount,
        account: acctName,
        notes: notesSnapshot || null,
        paperSize: getPrintDefault("paymentReceipt"),
        previousBalance,
      });
      promptAutoPrint(
        "paymentReceipt",
        "Recovery saved",
        "Payment recorded. Review the details before printing.",
        () => receiptHtml,
        [
          { label: "Client", value: clientNameSnapshot },
          { label: "Type", value: recoveryType === "city" ? "City Recovery" : "Individual" },
          { label: "Amount", value: `Rs ${amount.toLocaleString()}`, highlight: true },
          { label: "Account", value: acctName || "Cash" },
          { label: "Previous Balance", value: `Rs ${previousBalance.toLocaleString()}` },
          { label: "Remaining Balance", value: `Rs ${remainingBalance.toLocaleString()}` },
          ...(notesSnapshot ? [{ label: "Notes", value: notesSnapshot }] : []),
        ]
      );

    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add recovery", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !!form.clientId && !!form.amount && parseFloat(form.amount) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Recovery</DialogTitle>
          <DialogDescription>Record a recovery payment.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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

              {/* Recovery type toggle - only after client is selected */}
              {selectedClient && (
                <>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setRecoveryType("individual")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-colors",
                        recoveryType === "individual"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <User className="w-4 h-4" />
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecoveryType("city")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-colors border-l border-border",
                        recoveryType === "city"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                      City Recovery
                    </button>
                  </div>

                  {recoveryType === "city" && (
                    <div className="p-3 rounded-lg bg-accent/50 border border-accent text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      This will be added to today's city recovery list for{" "}
                      <span className="font-medium text-foreground">
                        {selectedClient.city && selectedClient.city !== "Unknown" ? selectedClient.city : "Unknown"}
                      </span>
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
                </>
              )}

              <div className="space-y-2">
                <Label>Recovery Amount (Rs)</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Add Recovery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
