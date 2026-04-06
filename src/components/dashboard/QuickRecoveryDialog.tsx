import { useState, useEffect } from "react";
import { Search, Loader2, User } from "lucide-react";
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
    if (open) {
      fetchData();
    }
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
  };

  const handleSubmit = async () => {
    if (!form.clientId || !form.amount) {
      toast({ title: "Missing fields", description: "Please select a client and enter an amount.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      const insertData: any = {
        client_id: form.clientId,
        amount,
        notes: form.notes || null,
        type: "client",
      };
      if (form.accountId) insertData.account_id = form.accountId;

      const { error } = await supabase.from("recoveries").insert(insertData);
      if (error) throw error;

      // Update client balance
      const client = clients.find((c) => c.id === form.clientId);
      if (client) {
        await supabase
          .from("clients")
          .update({ current_balance: client.currentBalance - amount })
          .eq("id", form.clientId);
      }

      await log({
        action: "create",
        entityType: "recovery",
        entityId: form.clientId,
        details: { clientName: form.clientName, amount, type: "client" },
      });

      toast({ title: "Success", description: `Recovery of Rs ${amount.toLocaleString()} added for ${form.clientName}` });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add recovery", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Recovery</DialogTitle>
          <DialogDescription>Record a client recovery payment.</DialogDescription>
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

          <div className="space-y-2">
            <Label>Amount (Rs)</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={form.accountId || "cash"} onValueChange={(v) => setForm({ ...form, accountId: v === "cash" ? "" : v })}>
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
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.clientId || !form.amount}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Add Recovery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
