import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Loader2, Search, Calendar, Download, FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { exportToCSV } from "@/utils/exportUtils";

interface Cheque {
  id: string;
  cheque_number: string;
  amount: number;
  cheque_date: string;
  given_to: string;
  bank_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  cleared: "bg-success/10 text-success border-success/30",
  bounced: "bg-destructive/10 text-destructive border-destructive/30",
};

const Cheques = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const { role, user } = useSupabaseAuthContext();
  const canEdit = role === "admin" || role === "manager";

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    cheque_number: "",
    amount: "",
    cheque_date: undefined as Date | undefined,
    given_to: "",
    bank_name: "",
    notes: "",
  });

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cheques")
        .select("*")
        .order("cheque_date", { ascending: true });
      if (error) throw error;
      setCheques(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load cheques", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCheques(); }, []);

  const filtered = useMemo(() => {
    return cheques.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.cheque_number.toLowerCase().includes(q) ||
        c.given_to.toLowerCase().includes(q) ||
        (c.bank_name || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cheques, searchQuery, statusFilter]);

  const handleAdd = async () => {
    if (!form.cheque_number || !form.amount || !form.cheque_date || !form.given_to) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from("cheques").insert({
        cheque_number: form.cheque_number.trim(),
        amount: parseFloat(form.amount),
        cheque_date: format(form.cheque_date, "yyyy-MM-dd"),
        given_to: form.given_to.trim(),
        bank_name: form.bank_name.trim() || null,
        notes: form.notes.trim() || null,
        status: "pending",
        created_by: user?.id || null,
      });
      if (error) throw error;
      await log({ action: "create", entityType: "cheque", details: { cheque_number: form.cheque_number } });
      toast({ title: "Success", description: "Cheque added" });
      setForm({ cheque_number: "", amount: "", cheque_date: undefined, given_to: "", bank_name: "", notes: "" });
      setIsAddOpen(false);
      fetchCheques();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add cheque", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("cheques").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await log({ action: "update", entityType: "cheque", entityId: id, details: { status: newStatus } });
      toast({ title: "Updated", description: `Cheque marked as ${newStatus}` });
      fetchCheques();
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cheques</h2>
          <p className="text-muted-foreground">Track given cheques and their status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            exportToCSV(filtered, [
              { key: "cheque_number", header: "Cheque #" },
              { key: "given_to", header: "Given To" },
              { key: "amount", header: "Amount" },
              { key: "cheque_date", header: "Date" },
              { key: "bank_name", header: "Bank", format: (v: any) => v || "N/A" },
              { key: "status", header: "Status" },
            ], "cheques");
          }}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Cheque
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Cheque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cheque Number <span className="text-destructive">*</span></Label>
                    <Input value={form.cheque_number} onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} placeholder="e.g. 001234" />
                  </div>
                  <div>
                    <Label>Amount (Rs) <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Given To <span className="text-destructive">*</span></Label>
                  <Input value={form.given_to} onChange={(e) => setForm({ ...form, given_to: e.target.value })} placeholder="Party name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cheque Date <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.cheque_date && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {form.cheque_date ? format(form.cheque_date, "dd MMM yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent mode="single" selected={form.cheque_date} onSelect={(d) => setForm({ ...form, cheque_date: d })} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Bank Name</Label>
                    <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional details..." rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Cheque
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search cheques..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cheques List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((cheque) => (
            <motion.div key={cheque.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">#{cheque.cheque_number}</h3>
                    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[cheque.status] || "")}>
                      {cheque.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Given to: <span className="font-medium text-foreground">{cheque.given_to}</span>
                    {cheque.bank_name && <> • {cheque.bank_name}</>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Date: {format(new Date(cheque.cheque_date), "dd MMM yyyy")}
                    {cheque.notes && <> • {cheque.notes}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">Rs {cheque.amount.toLocaleString()}</p>
                  {canEdit && cheque.status === "pending" && (
                    <div className="flex gap-1 mt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-success border-success/30"
                        onClick={() => handleStatusChange(cheque.id, "cleared")}>Cleared</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30"
                        onClick={() => handleStatusChange(cheque.id, "bounced")}>Bounced</Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No cheques found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cheques;
