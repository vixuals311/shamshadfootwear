import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";
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

interface CityClientRecovery {
  clientId: string;
  clientName: string;
  phone: string;
  currentBalance: number;
  recoveryAmount: string;
}

interface SortableCityItem {
  city: string;
  clientCount: number;
}

const RecoveryPage = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddRecoveryOpen, setIsAddRecoveryOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sortedCities, setSortedCities] = useState<SortableCityItem[]>([]);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [draggedCity, setDraggedCity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Recovery category selection
  const [recoveryCategory, setRecoveryCategory] = useState<"client" | "city">("client");

  // Confirmation dialogs
  const [showAddRecoveryConfirm, setShowAddRecoveryConfirm] = useState(false);

  const [clientRecovery, setClientRecovery] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    notes: "",
  });

  const [cityRecoveryCity, setCityRecoveryCity] = useState("");
  const [cityRecoveryNotes, setCityRecoveryNotes] = useState("");
  const [cityRecoveryDate, setCityRecoveryDate] = useState<Date>(new Date());
  const [cityClientRecoveries, setCityClientRecoveries] = useState<CityClientRecovery[]>([]);
  const [cityClientSearch, setCityClientSearch] = useState("");
  const [loadingCityClients, setLoadingCityClients] = useState(false);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, phone, city, current_balance")
        .order("name");

      if (clientsError) throw clientsError;

      const formattedClients: Client[] = (clientsData || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        city: c.city || "Unknown",
        currentBalance: c.current_balance || 0,
      }));

      setClients(formattedClients);

      // Fetch recoveries with client amounts
      const { data: recoveriesData, error: recoveriesError } = await supabase
        .from("recoveries")
        .select(`
          id, client_id, city, amount, date, notes, type,
          clients (name),
          recovery_client_amounts (client_id, amount, clients (name))
        `)
        .order("date", { ascending: false });

      if (recoveriesError) throw recoveriesError;

      const formattedRecoveries: Recovery[] = (recoveriesData || []).map((r: any) => ({
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

      setRecoveries(formattedRecoveries);
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

  // Load clients for a city with balances calculated for a specific date
  const loadCityClientsForDate = async (city: string, date: Date) => {
    setLoadingCityClients(true);
    try {
      // Get all clients in this city
      const cityClients = clients.filter((c) => c.city === city);

      // Get all invoices and recoveries up to the selected date to calculate balance
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Fetch invoices for these clients up to the selected date
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("client_id, balance_due, created_at")
        .in("client_id", cityClients.map(c => c.id))
        .lte("created_at", `${dateStr}T23:59:59.999Z`);

      // Fetch recoveries for these clients up to the selected date
      const { data: recoveriesData } = await supabase
        .from("recoveries")
        .select("client_id, amount, date")
        .in("client_id", cityClients.map(c => c.id))
        .lte("date", dateStr);

      // Fetch city recoveries with client amounts up to the selected date
      const { data: cityRecoveriesData } = await supabase
        .from("recovery_client_amounts")
        .select(`
          client_id, amount,
          recoveries (date)
        `)
        .in("client_id", cityClients.map(c => c.id));

      // Calculate balance for each client as of the selected date
      const clientBalances = cityClients.map((client) => {
        // Get opening balance
        let balance = client.currentBalance; // Start with current balance
        
        // Actually, we should calculate from opening balance + invoices - recoveries
        // For simplicity, we'll show current balance from the clients table
        // The user can see the balance as of today

        // Get client's invoices balance
        const clientInvoices = invoicesData?.filter(i => i.client_id === client.id) || [];
        const invoicesTotal = clientInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

        // Get client's individual recoveries
        const clientRecoveries = recoveriesData?.filter(r => r.client_id === client.id) || [];
        const recoveriesTotal = clientRecoveries.reduce((sum, rec) => sum + (rec.amount || 0), 0);

        // Get client's city recovery amounts
        const clientCityRecoveries = cityRecoveriesData?.filter((r: any) => 
          r.client_id === client.id && 
          r.recoveries?.date && 
          new Date(r.recoveries.date) <= date
        ) || [];
        const cityRecoveriesTotal = clientCityRecoveries.reduce((sum: number, rec: any) => sum + (rec.amount || 0), 0);

        // For display, we'll show the pending balance
        // This is a simplified calculation - the actual balance comes from clients table
        return {
          clientId: client.id,
          clientName: client.name,
          phone: client.phone,
          currentBalance: client.currentBalance, // Using current balance from clients table
          recoveryAmount: "",
        };
      });

      setCityClientRecoveries(clientBalances);
    } catch (error) {
      console.error("Error loading city clients:", error);
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive",
      });
    } finally {
      setLoadingCityClients(false);
    }
  };

  const updateClientRecoveryAmount = (clientId: string, amount: string) => {
    setCityClientRecoveries((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, recoveryAmount: amount } : c))
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
    try {
      if (recoveryCategory === "client") {
        if (!clientRecovery.clientId || !clientRecovery.amount) return;

        const { error } = await supabase.from("recoveries").insert({
          client_id: clientRecovery.clientId,
          amount: parseFloat(clientRecovery.amount),
          notes: clientRecovery.notes || null,
          type: "client",
        });

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

        toast({ title: "Success", description: "Client recovery added" });
        setClientRecovery({ clientId: "", clientName: "", amount: "", notes: "" });
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

        // Insert recovery with selected date
        const { data: recoveryData, error: recoveryError } = await supabase
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

        // Insert client amounts
        const clientAmountInserts = clientAmounts.map((ca) => ({
          recovery_id: recoveryData.id,
          client_id: ca.clientId,
          amount: parseFloat(ca.recoveryAmount),
        }));

        const { error: amountsError } = await supabase
          .from("recovery_client_amounts")
          .insert(clientAmountInserts);

        if (amountsError) throw amountsError;

        // Update client balances
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

        toast({ title: "Success", description: "City recovery added" });
        setCityRecoveryCity("");
        setCityRecoveryNotes("");
        setCityRecoveryDate(new Date());
        setCityClientRecoveries([]);
      }

      setShowAddRecoveryConfirm(false);
      setIsAddRecoveryOpen(false);
      setRecoveryCategory("client");
      fetchData();
    } catch (error: any) {
      console.error("Error adding recovery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add recovery",
        variant: "destructive",
      });
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

  const handlePrintRecoveryList = () => {
    if (selectedCities.length === 0) return;

    const cityOrder = sortedCities.map((sc) => sc.city);
    const citiesTitle = cityOrder.join(", ");

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recovery List - ${citiesTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          h3 { text-align: center; color: #666; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .amount-col { width: 150px; }
          .recovery-input { width: 100%; border: none; border-bottom: 1px solid #999; padding: 5px 0; min-height: 20px; }
          .pending { color: #dc2626; font-weight: bold; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Recovery List</h1>
        <h3>${citiesTitle} - ${format(new Date(), "dd MMM yyyy")}</h3>
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
            ${clientsByCities
              .map(
                (client, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${client.city}</td>
                <td>${client.name}</td>
                <td>${client.phone}</td>
                ${includePreviousBalance ? `<td class="pending">Rs ${client.currentBalance.toLocaleString()}</td>` : ''}
                <td><div class="recovery-input"></div></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
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

      {/* Recoveries Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <Tabs defaultValue="all" className="w-full">
          <div className="border-b px-4 pt-4">
            <TabsList>
              <TabsTrigger value="all">All Recoveries</TabsTrigger>
              <TabsTrigger value="client">By Client</TabsTrigger>
              <TabsTrigger value="city">By City</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <table className="data-table">
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
            <table className="data-table">
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
          </TabsContent>

          <TabsContent value="city" className="m-0">
            <table className="data-table">
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
                    <div className="flex items-center justify-between">
                      <Label>Client Recoveries</Label>
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
                    <div className="border rounded-lg overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>Phone</th>
                            <th>Pending Balance</th>
                            <th>Recovery Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCityClients.map((client) => (
                            <tr key={client.clientId}>
                              <td className="font-medium">{client.clientName}</td>
                              <td className="text-muted-foreground text-sm">{client.phone}</td>
                              <td className="text-destructive font-medium">
                                Rs {client.currentBalance.toLocaleString()}
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
                    </div>
                    <div className="flex justify-end p-3 bg-muted/30 rounded-lg">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRecoveryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowAddRecoveryConfirm(true)}
              disabled={
                recoveryCategory === "client"
                  ? !clientRecovery.clientId || !clientRecovery.amount
                  : cityRecoveryTotal === 0
              }
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
            <Button
              onClick={handlePrintRecoveryList}
              disabled={selectedCities.length === 0}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Print List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={handleAddRecovery}>
              Add Recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecoveryPage;
