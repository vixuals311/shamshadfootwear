import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  RotateCcw,
  FileText,
  Loader2,
  Package,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { format } from "date-fns";

interface InvoiceItem {
  id: string;
  product_id: string | null;
  product_name: string;
  article_number: string;
  brand_name: string | null;
  size_range: string;
  total_pairs: number;
  price_per_pair: number;
  discount_per_pair: number;
  total: number;
  quantity: number;
}

interface InvoiceResult {
  id: string;
  invoice_number: string;
  client_id: string | null;
  total: number;
  created_at: string;
  status: string;
  clients: { id: string; name: string } | null;
  invoice_items: InvoiceItem[];
}

interface ReturnItemEntry {
  invoiceItemId: string;
  productId: string | null;
  productName: string;
  articleNumber: string;
  brandName: string | null;
  sizeRange: string;
  maxPairs: number;
  pairsReturned: number;
  pricePerPair: number;
  total: number;
}

interface ReturnRecord {
  id: string;
  return_number: string;
  invoice_id: string;
  total_amount: number;
  adjustment_type: string;
  restock: boolean;
  notes: string | null;
  created_at: string;
  invoices: { invoice_number: string; clients: { name: string } | null } | null;
}

export default function Returns() {
  const { toast } = useToast();
  const { user } = useSupabaseAuthContext();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New return dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceResults, setInvoiceResults] = useState<InvoiceResult[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResult | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemEntry[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<"reduce_balance" | "credit_note">("reduce_balance");
  const [restock, setRestock] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchingInvoice, setSearchingInvoice] = useState(false);

  // Fetch existing returns
  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("returns")
      .select("*, invoices(invoice_number, clients(name))")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReturns(data as any);
    }
    setLoading(false);
  };

  // Search invoices by number
  const handleInvoiceSearch = async () => {
    if (!invoiceSearch.trim()) return;
    setSearchingInvoice(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_id, total, created_at, status, clients(id, name), invoice_items(*)")
      .ilike("invoice_number", `%${invoiceSearch.trim()}%`)
      .limit(10);

    if (!error && data) {
      setInvoiceResults(data as any);
    }
    setSearchingInvoice(false);
  };

  const selectInvoice = (invoice: InvoiceResult) => {
    setSelectedInvoice(invoice);
    setReturnItems([]);
    setInvoiceResults([]);
    setInvoiceSearch(invoice.invoice_number);
  };

  const addItemToReturn = (item: InvoiceItem) => {
    if (returnItems.find((r) => r.invoiceItemId === item.id)) return;
    const effectivePrice = item.price_per_pair - item.discount_per_pair;
    setReturnItems((prev) => [
      ...prev,
      {
        invoiceItemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        articleNumber: item.article_number,
        brandName: item.brand_name,
        sizeRange: item.size_range,
        maxPairs: item.total_pairs,
        pairsReturned: 1,
        pricePerPair: effectivePrice,
        total: effectivePrice,
      },
    ]);
  };

  const updatePairsReturned = (index: number, pairs: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              pairsReturned: Math.min(Math.max(1, pairs), item.maxPairs),
              total: Math.min(Math.max(1, pairs), item.maxPairs) * item.pricePerPair,
            }
          : item
      )
    );
  };

  const removeItemFromReturn = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalReturnAmount = useMemo(
    () => returnItems.reduce((sum, item) => sum + item.total, 0),
    [returnItems]
  );

  const handleSaveReturn = async () => {
    if (!selectedInvoice || returnItems.length === 0) return;
    setSaving(true);

    try {
      // Generate return number
      const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`;

      // Insert return
      const { data: returnData, error: returnError } = await supabase
        .from("returns")
        .insert({
          return_number: returnNumber,
          invoice_id: selectedInvoice.id,
          client_id: selectedInvoice.client_id,
          total_amount: totalReturnAmount,
          adjustment_type: adjustmentType,
          restock,
          notes: notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Insert return items
      const itemsToInsert = returnItems.map((item) => ({
        return_id: returnData.id,
        invoice_item_id: item.invoiceItemId,
        product_id: item.productId,
        product_name: item.productName,
        article_number: item.articleNumber,
        brand_name: item.brandName,
        size_range: item.sizeRange,
        pairs_returned: item.pairsReturned,
        price_per_pair: item.pricePerPair,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // If restock, update product_size_bundles quantity
      if (restock) {
        for (const item of returnItems) {
          if (item.productId) {
            // Update the specific size bundle quantity
            const { data: bundle } = await supabase
              .from("product_size_bundles")
              .select("id, quantity, pairs_per_bundle")
              .eq("product_id", item.productId)
              .eq("size_range", item.sizeRange)
              .single();

            if (bundle) {
              const bundlesReturned = Math.ceil(item.pairsReturned / bundle.pairs_per_bundle);
              await supabase
                .from("product_size_bundles")
                .update({ quantity: bundle.quantity + bundlesReturned })
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
              const newTotalPairs = currentTotalPairs + item.pairsReturned;
              const newDozens = newTotalPairs / product.pairs_per_dozen;

              await supabase
                .from("products")
                .update({ stock_dozens: newDozens })
                .eq("id", item.productId);
            }
          }
        }
      }

      // Adjust client balance
      if (selectedInvoice.client_id && adjustmentType === "reduce_balance") {
        const { data: client } = await supabase
          .from("clients")
          .select("current_balance")
          .eq("id", selectedInvoice.client_id)
          .single();

        if (client) {
          await supabase
            .from("clients")
            .update({ current_balance: client.current_balance - totalReturnAmount })
            .eq("id", selectedInvoice.client_id);
        }
      }

      toast({
        title: "Return recorded",
        description: `Return ${returnNumber} saved successfully`,
      });

      // Reset and close
      resetDialog();
      fetchReturns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save return",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setInvoiceSearch("");
    setInvoiceResults([]);
    setSelectedInvoice(null);
    setReturnItems([]);
    setAdjustmentType("reduce_balance");
    setRestock(false);
    setNotes("");
  };

  const filteredReturns = useMemo(() => {
    if (!searchQuery) return returns;
    const q = searchQuery.toLowerCase();
    return returns.filter(
      (r) =>
        r.return_number.toLowerCase().includes(q) ||
        r.invoices?.invoice_number?.toLowerCase().includes(q) ||
        r.invoices?.clients?.name?.toLowerCase().includes(q)
    );
  }, [returns, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Returns</h1>
          <p className="text-muted-foreground text-sm">
            Record item returns against invoices
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Return
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search returns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RotateCcw className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No returns recorded</h3>
            <p className="text-sm text-muted-foreground">
              Returns will appear here when items are returned by clients.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Restocked</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">{ret.return_number}</TableCell>
                    <TableCell>{ret.invoices?.invoice_number || "-"}</TableCell>
                    <TableCell>{ret.invoices?.clients?.name || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      Rs {ret.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ret.adjustment_type === "credit_note" ? "secondary" : "default"}>
                        {ret.adjustment_type === "credit_note" ? "Credit Note" : "Balance Reduced"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ret.restock ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ret.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Return Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Return</DialogTitle>
            <DialogDescription>
              Search for the original invoice and select items to return.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invoice Search */}
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search invoice number..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    if (selectedInvoice) {
                      setSelectedInvoice(null);
                      setReturnItems([]);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleInvoiceSearch()}
                />
                <Button
                  variant="outline"
                  onClick={handleInvoiceSearch}
                  disabled={searchingInvoice}
                >
                  {searchingInvoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Invoice search results */}
              {invoiceResults.length > 0 && !selectedInvoice && (
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {invoiceResults.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => selectInvoice(inv)}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex justify-between items-center text-sm"
                    >
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className="text-muted-foreground">
                        {inv.clients?.name || "Walk-in"} • Rs {inv.total.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected invoice items */}
            {selectedInvoice && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{selectedInvoice.clients?.name || "Walk-in"}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Invoice Total</span>
                    <span className="font-medium">Rs {selectedInvoice.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Available items to return */}
                <div className="space-y-2">
                  <Label>Select items to return</Label>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {selectedInvoice.invoice_items.map((item) => {
                      const alreadyAdded = returnItems.some(
                        (r) => r.invoiceItemId === item.id
                      );
                      return (
                        <div
                          key={item.id}
                          className="px-3 py-2 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.article_number} • {item.size_range} • {item.total_pairs} pairs
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant={alreadyAdded ? "secondary" : "outline"}
                            disabled={alreadyAdded}
                            onClick={() => addItemToReturn(item)}
                          >
                            {alreadyAdded ? "Added" : "Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return items with pairs input */}
                {returnItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Items being returned</Label>
                    <div className="border rounded-lg divide-y">
                      {returnItems.map((item, index) => (
                        <div
                          key={item.invoiceItemId}
                          className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.productName}</div>
                            <div className="text-muted-foreground text-xs">
                              {item.sizeRange} • Max {item.maxPairs} pairs • Rs {item.pricePerPair}/pair
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={item.maxPairs}
                              value={item.pairsReturned}
                              onChange={(e) =>
                                updatePairsReturned(index, parseInt(e.target.value) || 1)
                              }
                              className="w-20 text-center"
                            />
                            <span className="text-muted-foreground whitespace-nowrap">
                              Rs {item.total.toLocaleString()}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={() => removeItemFromReturn(index)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-right font-semibold">
                      Total Return: Rs {totalReturnAmount.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Options */}
                {returnItems.length > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Balance Adjustment</Label>
                      <Select
                        value={adjustmentType}
                        onValueChange={(v) => setAdjustmentType(v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reduce_balance">
                            Reduce Balance Owed
                          </SelectItem>
                          <SelectItem value="credit_note">
                            Issue Credit Note
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Restock Items</Label>
                        <p className="text-xs text-muted-foreground">
                          Add returned pairs back to inventory
                        </p>
                      </div>
                      <Switch checked={restock} onCheckedChange={setRestock} />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Reason for return..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReturn}
              disabled={saving || returnItems.length === 0}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
