import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Plus, Trash2, AlertTriangle, CheckCircle2, Loader2, Download, UsersRound } from "lucide-react";
import { parseCSV, findColumnIndex, triggerFileInput } from "@/utils/importUtils";
import { CityCombobox } from "@/components/clients/CityCombobox";
import { Label } from "@/components/ui/label";

interface BulkClientRow {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  referenceNumber: string;
  openingBalance: string;
  status: "pending" | "duplicate" | "valid" | "error" | "imported";
  duplicateOf?: string;
  errorMessage?: string;
}

const emptyRow = (): BulkClientRow => ({
  id: crypto.randomUUID(),
  name: "",
  phone: "",
  city: "",
  address: "",
  referenceNumber: "",
  openingBalance: "0",
  status: "pending",
});

export default function BulkClients() {
  const [rows, setRows] = useState<BulkClientRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validated, setValidated] = useState(false);
  const [refPrefix, setRefPrefix] = useState("");
  const [masterCity, setMasterCity] = useState("");
  const [existingCities, setExistingCities] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("clients").select("city").then(({ data }) => {
      if (data) {
        const cities = data.map(c => c.city).filter(Boolean) as string[];
        setExistingCities(cities);
      }
    });
  }, []);

  const applyMasterCity = (city: string) => {
    setMasterCity(city);
    setRows(prev => prev.map(r => r.status !== "imported" ? { ...r, city, status: "pending" } : r));
    setValidated(false);
  };

  const applyRefPrefix = (prefix: string) => {
    const formatted = prefix.trim().charAt(0).toUpperCase() + prefix.trim().slice(1);
    const withDash = formatted.endsWith("-") ? formatted : `${formatted}-`;
    setRefPrefix(withDash);
    setRows(prev => prev.map(r =>
      r.status !== "imported"
        ? { ...r, referenceNumber: withDash, status: "pending" }
        : r
    ));
    setValidated(false);
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 4) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    return digits;
  };

  const updateRow = (id: string, field: keyof BulkClientRow, value: string) => {
    const finalValue = field === "phone" ? formatPhone(value) : value;
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: finalValue, status: "pending" } : r));
    setValidated(false);
  };

  const addRows = (count: number = 1) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, () => emptyRow())]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setValidated(false);
  };

  const clearAll = () => {
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    setValidated(false);
  };

  const handleCSVUpload = useCallback(() => {
    triggerFileInput(".csv", async (file) => {
      const text = await file.text();
      const { headers, rows: csvRows } = parseCSV(text);

      const nameIdx = findColumnIndex(headers, "name", "client");
      const phoneIdx = findColumnIndex(headers, "phone", "mobile", "contact");
      const cityIdx = findColumnIndex(headers, "city", "town");
      const addressIdx = findColumnIndex(headers, "address", "location");
      const refIdx = findColumnIndex(headers, "reference", "ref");
      const balanceIdx = findColumnIndex(headers, "balance", "opening");

      if (nameIdx === -1 || phoneIdx === -1) {
        toast({ title: "Invalid CSV", description: "CSV must have at least 'name' and 'phone' columns.", variant: "destructive" });
        return;
      }

      const parsed: BulkClientRow[] = csvRows
        .filter(row => row[nameIdx]?.trim())
        .map(row => ({
          id: crypto.randomUUID(),
          name: row[nameIdx]?.trim() || "",
          phone: row[phoneIdx]?.trim() || "",
          city: cityIdx >= 0 ? row[cityIdx]?.trim() || "" : "",
          address: addressIdx >= 0 ? row[addressIdx]?.trim() || "" : "",
          referenceNumber: refIdx >= 0 ? row[refIdx]?.trim() || "" : "",
          openingBalance: balanceIdx >= 0 ? row[balanceIdx]?.trim() || "0" : "0",
          status: "pending" as const,
        }));

      if (parsed.length === 0) {
        toast({ title: "No data", description: "No valid rows found in CSV.", variant: "destructive" });
        return;
      }

      setRows(parsed);
      setValidated(false);
      toast({ title: "CSV Loaded", description: `${parsed.length} clients loaded from CSV.` });
    });
  }, []);

  const validateRows = async () => {
    setIsValidating(true);
    try {
      // Get all existing phone numbers
      const { data: existingClients } = await supabase
        .from("clients")
        .select("phone, name");

      const existingPhones = new Map(
        (existingClients || []).map(c => [c.phone.replace(/\D/g, ""), c.name])
      );

      const phonesSeen = new Map<string, number>();

      const updated = rows.map((row, idx) => {
        const errors: string[] = [];

        if (!row.name.trim()) errors.push("Name is required");
        if (!row.phone.trim()) errors.push("Phone is required");
        if (!row.city.trim()) errors.push("City is required");
        if (!row.address.trim()) errors.push("Address is required");
        if (!row.referenceNumber.trim()) errors.push("Reference # is required");

        const phoneDigits = row.phone.replace(/\D/g, "");

        if (errors.length > 0) {
          return { ...row, status: "error" as const, errorMessage: errors.join(", ") };
        }

        // Check duplicate in database
        if (existingPhones.has(phoneDigits)) {
          return { ...row, status: "duplicate" as const, duplicateOf: existingPhones.get(phoneDigits) };
        }

        // Check duplicate within current batch
        if (phonesSeen.has(phoneDigits)) {
          return { ...row, status: "duplicate" as const, duplicateOf: `Row ${(phonesSeen.get(phoneDigits)!) + 1}` };
        }

        phonesSeen.set(phoneDigits, idx);
        return { ...row, status: "valid" as const, errorMessage: undefined, duplicateOf: undefined };
      });

      setRows(updated);
      setValidated(true);

      const valid = updated.filter(r => r.status === "valid").length;
      const dups = updated.filter(r => r.status === "duplicate").length;
      const errs = updated.filter(r => r.status === "error").length;
      toast({
        title: "Validation Complete",
        description: `${valid} valid, ${dups} duplicates, ${errs} errors`,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const importClients = async () => {
    const validRows = rows.filter(r => r.status === "valid");
    if (validRows.length === 0) {
      toast({ title: "Nothing to import", description: "No valid rows to import.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const toInsert = validRows.map(r => ({
        name: r.name.trim(),
        phone: r.phone.trim(),
        city: r.city.trim(),
        address: r.address.trim(),
        reference_number: r.referenceNumber.trim(),
        opening_balance: parseFloat(r.openingBalance) || 0,
        current_balance: parseFloat(r.openingBalance) || 0,
      }));

      const { error } = await supabase.from("clients").insert(toInsert);

      if (error) throw error;

      setRows(prev =>
        prev.map(r => r.status === "valid" ? { ...r, status: "imported" as const } : r)
      );

      toast({ title: "Import Successful", description: `${validRows.length} clients imported.` });
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,phone,city,address,reference_number,opening_balance\nJohn Doe,0300-1234567,Lahore,Shop 1 Main Market,REF-001,5000\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_clients_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.filter(r => r.status === "valid").length;
  const dupCount = rows.filter(r => r.status === "duplicate").length;
  const errorCount = rows.filter(r => r.status === "error").length;
  const importedCount = rows.filter(r => r.status === "imported").length;
  const nonEmptyRows = rows.filter(r => r.name.trim() || r.phone.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="w-7 h-7" />
            Bulk Add Clients
          </h1>
          <p className="text-muted-foreground mt-1">Import multiple clients at once via CSV or manual entry</p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV with columns: name, phone, city, address, reference_number, opening_balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={handleCSVUpload} variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" /> Upload CSV
                </Button>
                <Button onClick={downloadTemplate} variant="ghost" className="gap-2">
                  <Download className="w-4 h-4" /> Download Template
                </Button>
              </div>
              {nonEmptyRows.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {nonEmptyRows.length} rows loaded from CSV. Switch to "Manual Entry" tab to review and edit.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Client Entries</CardTitle>
                  <CardDescription>{rows.length} rows total</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => addRows(1)} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Row
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addRows(5)} className="gap-1">
                    <Plus className="w-3 h-3" /> Add 5
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearAll}>Clear All</Button>
                </div>
              </div>
              <div className="flex items-end gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <div className="flex-1 max-w-xs space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Master City (applies to all rows)</Label>
                  <CityCombobox
                    value={masterCity}
                    onChange={applyMasterCity}
                    existingCities={existingCities}
                    placeholder="Select city for all..."
                  />
                </div>
                {masterCity && (
                  <p className="text-xs text-muted-foreground pb-2">All rows set to <span className="font-semibold text-foreground">{masterCity}</span></p>
                )}
                <div className="flex-1 max-w-xs space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Reference Prefix (applies to all rows)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={refPrefix}
                      onChange={e => setRefPrefix(e.target.value)}
                      placeholder="e.g. Fateh"
                      className="h-9 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={() => applyRefPrefix(refPrefix)} disabled={!refPrefix.trim()}>
                      Apply
                    </Button>
                  </div>
                </div>
                {refPrefix && (
                  <p className="text-xs text-muted-foreground pb-2">Each row starts with <span className="font-semibold text-foreground">{refPrefix}</span> — add number manually (e.g. <span className="font-semibold text-foreground">{refPrefix}001</span>)</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="min-w-[140px]">Name *</TableHead>
                      <TableHead className="min-w-[140px]">Phone *</TableHead>
                      <TableHead className="min-w-[120px]">City *</TableHead>
                      <TableHead className="min-w-[160px]">Address *</TableHead>
                      <TableHead className="min-w-[100px]">Ref # *</TableHead>
                      <TableHead className="min-w-[100px]">Opening Bal</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.id} className={
                        row.status === "duplicate" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                        row.status === "error" ? "bg-red-50 dark:bg-red-950/20" :
                        row.status === "imported" ? "bg-green-50 dark:bg-green-950/20" :
                        row.status === "valid" ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                      }>
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={row.name}
                            onChange={e => updateRow(row.id, "name", e.target.value)}
                            placeholder="Client name"
                            className="h-8 text-sm"
                            disabled={row.status === "imported"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.phone}
                            onChange={e => updateRow(row.id, "phone", e.target.value)}
                            placeholder="0XXX-XXXXXXX"
                            className="h-8 text-sm"
                            disabled={row.status === "imported"}
                          />
                        </TableCell>
                        <TableCell>
                          {row.status === "imported" ? (
                            <span className="text-sm px-3">{row.city}</span>
                          ) : (
                            <CityCombobox
                              value={row.city}
                              onChange={(val) => updateRow(row.id, "city", val)}
                              existingCities={existingCities}
                              placeholder="City"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.address}
                            onChange={e => updateRow(row.id, "address", e.target.value)}
                            placeholder="Address"
                            className="h-8 text-sm"
                            disabled={row.status === "imported"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.referenceNumber}
                            onChange={e => updateRow(row.id, "referenceNumber", e.target.value)}
                            placeholder="REF-001"
                            className="h-8 text-sm"
                            disabled={row.status === "imported"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.openingBalance}
                            onChange={e => updateRow(row.id, "openingBalance", e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm"
                            disabled={row.status === "imported"}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge row={row} />
                        </TableCell>
                        <TableCell>
                          {row.status !== "imported" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(row.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary & Actions */}
      {nonEmptyRows.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3 flex-wrap text-sm">
                {validated && (
                  <>
                    <span className="text-emerald-600 font-medium">{validCount} valid</span>
                    {dupCount > 0 && <span className="text-yellow-600 font-medium">{dupCount} duplicates</span>}
                    {errorCount > 0 && <span className="text-destructive font-medium">{errorCount} errors</span>}
                    {importedCount > 0 && <span className="text-primary font-medium">{importedCount} imported</span>}
                  </>
                )}
                {!validated && <span className="text-muted-foreground">{nonEmptyRows.length} rows ready for validation</span>}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={validateRows}
                  disabled={isValidating || nonEmptyRows.length === 0}
                  variant="outline"
                  className="gap-2"
                >
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Validate
                </Button>
                <Button
                  onClick={importClients}
                  disabled={!validated || validCount === 0 || isImporting}
                  className="gap-2"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Import {validCount > 0 ? `${validCount} Clients` : ""}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ row }: { row: BulkClientRow }) {
  switch (row.status) {
    case "valid":
      return <Badge variant="default" className="bg-emerald-600 text-xs">Valid</Badge>;
    case "duplicate":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs cursor-help" title={`Duplicate of: ${row.duplicateOf}`}>
          Duplicate
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-xs cursor-help" title={row.errorMessage}>
          Error
        </Badge>
      );
    case "imported":
      return <Badge variant="default" className="bg-primary text-xs">Imported</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
  }
}
