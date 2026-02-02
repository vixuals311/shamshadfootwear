import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Printer,
  CreditCard,
  User,
  MapPin,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Client, Recovery } from "@/types";
import { initialClients, initialRecoveries } from "@/data/mockData";
import { format } from "date-fns";

interface CityClientRecovery {
  clientId: string;
  clientName: string;
  phone: string;
  currentBalance: number;
  recoveryAmount: string;
}

const RecoveryPage = () => {
  const [clients] = useState<Client[]>(initialClients);
  const [recoveries, setRecoveries] = useState<Recovery[]>(initialRecoveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientRecoveryOpen, setIsAddClientRecoveryOpen] = useState(false);
  const [isAddCityRecoveryOpen, setIsAddCityRecoveryOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  // Confirmation dialogs
  const [showAddClientRecoveryConfirm, setShowAddClientRecoveryConfirm] = useState(false);
  const [showAddCityRecoveryConfirm, setShowAddCityRecoveryConfirm] = useState(false);

  const [clientRecovery, setClientRecovery] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    notes: "",
  });

  const [cityRecoveryCity, setCityRecoveryCity] = useState("");
  const [cityRecoveryNotes, setCityRecoveryNotes] = useState("");
  const [cityClientRecoveries, setCityClientRecoveries] = useState<CityClientRecovery[]>([]);
  const [cityClientSearch, setCityClientSearch] = useState("");

  // Get unique cities
  const cities = useMemo(() => {
    return [...new Set(clients.map((c) => c.city))];
  }, [clients]);

  // Get clients by selected cities for print
  const clientsByCities = useMemo(() => {
    if (selectedCities.length === 0) return [];
    return clients
      .filter((c) => selectedCities.includes(c.city))
      .sort((a, b) => {
        const cityCompare = a.city.localeCompare(b.city);
        if (cityCompare !== 0) return cityCompare;
        return a.name.localeCompare(b.name);
      });
  }, [clients, selectedCities]);

  // Update city client recoveries when city changes
  const handleCityChange = (city: string) => {
    setCityRecoveryCity(city);
    const cityClients = clients
      .filter((c) => c.city === city)
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        phone: c.phone,
        currentBalance: c.currentBalance,
        recoveryAmount: "",
      }));
    setCityClientRecoveries(cityClients);
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

  const filteredRecoveries = recoveries.filter(
    (recovery) =>
      recovery.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recovery.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectClient = (client: Client) => {
    setClientRecovery({
      ...clientRecovery,
      clientId: client.id,
      clientName: client.name,
    });
    setClientSearchOpen(false);
  };

  const handleAddClientRecovery = () => {
    if (clientRecovery.clientId && clientRecovery.amount) {
      const client = clients.find((c) => c.id === clientRecovery.clientId);
      const newRecovery: Recovery = {
        id: Date.now().toString(),
        clientId: clientRecovery.clientId,
        clientName: client?.name,
        amount: parseFloat(clientRecovery.amount),
        date: new Date(),
        notes: clientRecovery.notes,
        type: "client",
      };
      setRecoveries([newRecovery, ...recoveries]);
      setClientRecovery({ clientId: "", clientName: "", amount: "", notes: "" });
      setShowAddClientRecoveryConfirm(false);
      setIsAddClientRecoveryOpen(false);
    }
  };

  const handleAddCityRecovery = () => {
    if (cityRecoveryCity) {
      const clientAmounts = cityClientRecoveries
        .filter((c) => parseFloat(c.recoveryAmount) > 0)
        .map((c) => ({
          clientId: c.clientId,
          clientName: c.clientName,
          amount: parseFloat(c.recoveryAmount),
        }));

      const totalAmount = clientAmounts.reduce((sum, c) => sum + c.amount, 0);

      if (totalAmount > 0) {
        const newRecovery: Recovery = {
          id: Date.now().toString(),
          city: cityRecoveryCity,
          amount: totalAmount,
          date: new Date(),
          notes: cityRecoveryNotes,
          type: "city",
          clientAmounts,
        };
        setRecoveries([newRecovery, ...recoveries]);
        setCityRecoveryCity("");
        setCityRecoveryNotes("");
        setCityClientRecoveries([]);
        setShowAddCityRecoveryConfirm(false);
        setIsAddCityRecoveryOpen(false);
      }
    }
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const handlePrintRecoveryList = () => {
    if (selectedCities.length === 0) return;

    const citiesTitle = selectedCities.join(", ");

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
              <th>Pending Balance</th>
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
                <td class="pending">Rs ${client.currentBalance.toLocaleString()}</td>
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
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsAddCityRecoveryOpen(true)}
          >
            <MapPin className="w-4 h-4" />
            Add City Recovery
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setIsAddClientRecoveryOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Client Recovery
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

      {/* Search */}
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
                    <td>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(recovery.date, "dd MMM yyyy, hh:mm a")}
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
                      <td>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(recovery.date, "dd MMM yyyy, hh:mm a")}
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
                      <td>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(recovery.date, "dd MMM yyyy, hh:mm a")}
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

      {/* Add Client Recovery Dialog */}
      <Dialog open={isAddClientRecoveryOpen} onOpenChange={setIsAddClientRecoveryOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Client Recovery</DialogTitle>
            <DialogDescription>
              Record a payment recovery from a specific client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClientRecoveryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddClientRecoveryConfirm(true)}>
              Add Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add City Recovery Dialog */}
      <Dialog open={isAddCityRecoveryOpen} onOpenChange={setIsAddCityRecoveryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add City Recovery</DialogTitle>
            <DialogDescription>
              Record recoveries for all clients in a city at once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select City</Label>
              <Select value={cityRecoveryCity} onValueChange={handleCityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city} ({clients.filter((c) => c.city === city).length} clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cityClientRecoveries.length > 0 && (
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCityRecoveryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowAddCityRecoveryConfirm(true)}
              disabled={cityRecoveryTotal === 0}
            >
              Add Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print by City Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Print Recovery List by Cities</DialogTitle>
            <DialogDescription>
              Select one or more cities to print a recovery list with client balances.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Cities</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {cities.map((city) => (
                  <div
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                      selectedCities.includes(city)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{city}</span>
                      <span className="text-xs text-muted-foreground">
                        {clients.filter((c) => c.city === city).length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedCities.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  This will print a list of {clientsByCities.length} clients in{" "}
                  <span className="font-medium text-foreground">
                    {selectedCities.join(", ")}
                  </span>{" "}
                  sorted by city and name.
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

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={showAddClientRecoveryConfirm}
        onOpenChange={setShowAddClientRecoveryConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Client Recovery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add a recovery of Rs{" "}
              {parseFloat(clientRecovery.amount || "0").toLocaleString()} for{" "}
              {clientRecovery.clientName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddClientRecovery}>
              Add Recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showAddCityRecoveryConfirm}
        onOpenChange={setShowAddCityRecoveryConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add City Recovery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add a total recovery of Rs{" "}
              {cityRecoveryTotal.toLocaleString()} for{" "}
              {cityClientRecoveries.filter((c) => parseFloat(c.recoveryAmount) > 0).length}{" "}
              clients in {cityRecoveryCity}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddCityRecovery}>
              Add Recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecoveryPage;
