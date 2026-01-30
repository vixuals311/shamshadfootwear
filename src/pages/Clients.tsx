import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Edit2,
  Trash2,
  Grid3X3,
  List,
  ArrowLeft,
  FileText,
  CreditCard,
  Calendar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Client, Invoice, Recovery } from "@/types";
import { initialClients, initialInvoices, initialRecoveries } from "@/data/mockData";
import { format } from "date-fns";

const Clients = () => {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [invoices] = useState<Invoice[]>(initialInvoices);
  const [recoveries] = useState<Recovery[]>(initialRecoveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    openingBalance: "",
    notes: "",
  });

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = () => {
    if (newClient.name) {
      const client: Client = {
        id: Date.now().toString(),
        name: newClient.name,
        email: newClient.email || "N/A",
        phone: newClient.phone || "N/A",
        address: newClient.address || "N/A",
        city: newClient.city || "N/A",
        openingBalance: parseFloat(newClient.openingBalance) || 0,
        currentBalance: parseFloat(newClient.openingBalance) || 0,
        totalSpent: 0,
        invoiceCount: 0,
        notes: newClient.notes,
      };
      setClients([client, ...clients]);
      setNewClient({ name: "", email: "", phone: "", address: "", city: "", openingBalance: "", notes: "" });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter((c) => c.id !== id));
  };

  const getClientInvoices = (clientId: string) => {
    return invoices.filter((inv) => inv.clientId === clientId);
  };

  const getClientRecoveries = (clientId: string) => {
    return recoveries.filter((rec) => rec.clientId === clientId);
  };

  // Client Detail View
  if (selectedClient) {
    const clientInvoices = getClientInvoices(selectedClient.id);
    const clientRecoveries = getClientRecoveries(selectedClient.id);

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{selectedClient.name}</h2>
            <p className="text-muted-foreground">{selectedClient.city}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-primary">
              Rs {selectedClient.currentBalance.toLocaleString()}
            </p>
          </div>
        </motion.div>

        {/* Client Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedClient.phone}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{selectedClient.email}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="font-medium">Rs {selectedClient.openingBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="font-medium">Rs {selectedClient.totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs for Bills and Recoveries */}
        <Tabs defaultValue="bills" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bills" className="gap-2">
              <FileText className="w-4 h-4" />
              Bills ({clientInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="recoveries" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Recoveries ({clientRecoveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bills">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-xl shadow-card overflow-hidden"
            >
              {clientInvoices.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date & Time</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map((invoice) => (
                      <tr key={invoice.id} className="group">
                        <td className="font-mono">{invoice.invoiceNumber}</td>
                        <td>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {format(invoice.createdAt, "dd MMM yyyy, hh:mm a")}
                          </div>
                        </td>
                        <td>{invoice.items.length} items</td>
                        <td className="font-semibold">Rs {invoice.total.toLocaleString()}</td>
                        <td>
                          <span className={cn(
                            "status-badge",
                            invoice.status === "paid" && "status-badge-success",
                            invoice.status === "partial" && "status-badge-warning",
                            invoice.status === "overdue" && "status-badge-danger"
                          )}>
                            {invoice.status}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No bills yet</h3>
                  <p className="text-muted-foreground">This client has no invoices.</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="recoveries">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-xl shadow-card overflow-hidden"
            >
              {clientRecoveries.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRecoveries.map((recovery) => (
                      <tr key={recovery.id}>
                        <td>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {format(recovery.date, "dd MMM yyyy, hh:mm a")}
                          </div>
                        </td>
                        <td className="font-semibold text-success">
                          Rs {recovery.amount.toLocaleString()}
                        </td>
                        <td className="text-muted-foreground">{recovery.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No recoveries yet</h3>
                  <p className="text-muted-foreground">This client has no recovery records.</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Invoice Detail Dialog */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
              <DialogDescription>
                {selectedInvoice && format(selectedInvoice.createdAt, "dd MMM yyyy, hh:mm a")}
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Discount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">{item.articleNumber}</p>
                          </div>
                        </td>
                        <td>{item.sizeRange}</td>
                        <td>{item.quantity} × {item.pairsPerBundle}</td>
                        <td>Rs {item.pricePerPair}</td>
                        <td className="text-destructive">
                          {item.discount > 0 ? `- Rs ${item.discount}` : "-"}
                        </td>
                        <td className="font-semibold">Rs {item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rs {selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-destructive">- Rs {selectedInvoice.totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">Rs {selectedInvoice.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main Clients List View
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name *</Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) =>
                        setNewClient({ ...newClient, name: e.target.value })
                      }
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Opening Balance (Rs)</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={newClient.openingBalance}
                      onChange={(e) =>
                        setNewClient({ ...newClient, openingBalance: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient({ ...newClient, phone: e.target.value })
                      }
                      placeholder="Enter phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newClient.city}
                      onChange={(e) =>
                        setNewClient({ ...newClient, city: e.target.value })
                      }
                      placeholder="Enter city"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newClient.address}
                    onChange={(e) =>
                      setNewClient({ ...newClient, address: e.target.value })
                    }
                    placeholder="Enter full address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newClient.notes}
                    onChange={(e) =>
                      setNewClient({ ...newClient, notes: e.target.value })
                    }
                    placeholder="Add any notes about this client..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddClient}>Add Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none",
                viewMode === "grid" && "bg-muted"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none",
                viewMode === "list" && "bg-muted"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Clients Grid/List */}
      {viewMode === "grid" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedClient(client)}
              className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {client.invoiceCount} invoices
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{client.city}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className={cn(
                    "text-lg font-bold",
                    client.currentBalance > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    Rs {client.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl shadow-card overflow-hidden"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>City</th>
                <th>Opening Bal.</th>
                <th>Current Bal.</th>
                <th>Invoices</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        {client.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <p className="text-sm">{client.phone}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{client.city}</td>
                  <td>Rs {client.openingBalance.toLocaleString()}</td>
                  <td className={cn(
                    "font-medium",
                    client.currentBalance > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    Rs {client.currentBalance.toLocaleString()}
                  </td>
                  <td>{client.invoiceCount}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {filteredClients.length === 0 && (
        <div className="bg-card rounded-xl p-12 text-center shadow-card">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No clients found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or add a new client.
          </p>
        </div>
      )}
    </div>
  );
};

export default Clients;
