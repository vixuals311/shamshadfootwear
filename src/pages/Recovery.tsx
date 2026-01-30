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
  Download,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Client, Recovery } from "@/types";
import { initialClients, initialRecoveries } from "@/data/mockData";
import { format } from "date-fns";

const RecoveryPage = () => {
  const [clients] = useState<Client[]>(initialClients);
  const [recoveries, setRecoveries] = useState<Recovery[]>(initialRecoveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientRecoveryOpen, setIsAddClientRecoveryOpen] = useState(false);
  const [isAddCityRecoveryOpen, setIsAddCityRecoveryOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  
  const [clientRecovery, setClientRecovery] = useState({
    clientId: "",
    amount: "",
    notes: "",
  });

  const [cityRecovery, setCityRecovery] = useState({
    city: "",
    amount: "",
    notes: "",
  });

  // Get unique cities
  const cities = useMemo(() => {
    return [...new Set(clients.map((c) => c.city))];
  }, [clients]);

  // Get clients by city for print
  const clientsByCity = useMemo(() => {
    if (!selectedCity) return [];
    return clients.filter((c) => c.city === selectedCity);
  }, [clients, selectedCity]);

  const filteredRecoveries = recoveries.filter(
    (recovery) =>
      recovery.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recovery.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      setClientRecovery({ clientId: "", amount: "", notes: "" });
      setIsAddClientRecoveryOpen(false);
    }
  };

  const handleAddCityRecovery = () => {
    if (cityRecovery.city && cityRecovery.amount) {
      const newRecovery: Recovery = {
        id: Date.now().toString(),
        city: cityRecovery.city,
        amount: parseFloat(cityRecovery.amount),
        date: new Date(),
        notes: cityRecovery.notes,
        type: "city",
      };
      setRecoveries([newRecovery, ...recoveries]);
      setCityRecovery({ city: "", amount: "", notes: "" });
      setIsAddCityRecoveryOpen(false);
    }
  };

  const handlePrintRecoveryList = () => {
    if (!selectedCity) return;
    
    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recovery List - ${selectedCity}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          h3 { text-align: center; color: #666; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .amount-col { width: 150px; }
          .recovery-input { width: 100%; border: none; border-bottom: 1px solid #999; padding: 5px 0; }
          .pending { color: #dc2626; font-weight: bold; }
          @media print { 
            button { display: none; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Recovery List</h1>
        <h3>${selectedCity} - ${format(new Date(), "dd MMM yyyy")}</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Client Name</th>
              <th>Phone</th>
              <th>Pending Balance</th>
              <th class="amount-col">Recovery Amount</th>
            </tr>
          </thead>
          <tbody>
            ${clientsByCity.map((client, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${client.name}</td>
                <td>${client.phone}</td>
                <td class="pending">Rs ${client.currentBalance.toLocaleString()}</td>
                <td><div class="recovery-input"></div></td>
              </tr>
            `).join("")}
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
  };

  // Calculate totals
  const totalRecovery = useMemo(() => {
    return recoveries.reduce((sum, r) => sum + r.amount, 0);
  }, [recoveries]);

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
          <p className="text-muted-foreground">
            Manage client payments and recoveries
          </p>
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
                      <span className={cn(
                        "status-badge",
                        recovery.type === "client" ? "status-badge-success" : "status-badge-warning"
                      )}>
                        {recovery.type === "client" ? "Client" : "City"}
                      </span>
                    </td>
                    <td className="font-medium">
                      {recovery.type === "client" ? recovery.clientName : recovery.city}
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
              <Label>Select Client</Label>
              <Select
                value={clientRecovery.clientId}
                onValueChange={(value) =>
                  setClientRecovery({ ...clientRecovery, clientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{client.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Balance: Rs {client.currentBalance.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleAddClientRecovery}>Add Recovery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add City Recovery Dialog */}
      <Dialog open={isAddCityRecoveryOpen} onOpenChange={setIsAddCityRecoveryOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add City Recovery</DialogTitle>
            <DialogDescription>
              Record a bulk recovery for all clients in a city.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select City</Label>
              <Select
                value={cityRecovery.city}
                onValueChange={(value) =>
                  setCityRecovery({ ...cityRecovery, city: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Amount (Rs)</Label>
              <Input
                type="number"
                value={cityRecovery.amount}
                onChange={(e) =>
                  setCityRecovery({ ...cityRecovery, amount: e.target.value })
                }
                placeholder="Enter total amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={cityRecovery.notes}
                onChange={(e) =>
                  setCityRecovery({ ...cityRecovery, notes: e.target.value })
                }
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCityRecoveryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCityRecovery}>Add Recovery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print by City Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Print Recovery List by City</DialogTitle>
            <DialogDescription>
              Select a city to print a recovery list with client balances.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
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
            {selectedCity && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  This will print a list of {clientsByCity.length} clients in{" "}
                  <span className="font-medium text-foreground">{selectedCity}</span>{" "}
                  with their pending balances and a column for writing recovery amounts.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrintRecoveryList} disabled={!selectedCity} className="gap-2">
              <Printer className="w-4 h-4" />
              Print List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecoveryPage;
