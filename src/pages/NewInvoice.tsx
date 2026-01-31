import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Save,
  Printer,
  Send,
  User,
  Package,
  Calculator,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Client, Product, InvoiceItem, SizeBundlePricing } from "@/types";
import { initialClients, initialProducts, paymentAccounts } from "@/data/mockData";

const NewInvoice = () => {
  const navigate = useNavigate();
  const [clients] = useState<Client[]>(initialClients);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "account">("cash");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);

  const addProduct = (product: Product, sizeBundle: SizeBundlePricing) => {
    // Check if same product with same size already exists
    const existingItemIndex = items.findIndex(
      (item) => item.productId === product.id && item.sizeRange === sizeBundle.sizeRange
    );

    if (existingItemIndex !== -1) {
      // Increment bundle quantity for existing item
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      const totalPairs = newQuantity * existingItem.pairsPerBundle;
      const discountTotal = totalPairs * existingItem.discountPerPair;
      const total = totalPairs * existingItem.pricePerPair - discountTotal;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total: Math.max(0, total),
      };
      setItems(updatedItems);
    } else {
      // Add new item
      const itemId = `${product.id}-${sizeBundle.sizeRange}-${Date.now()}`;
      const quantity = 1;
      const pairsPerBundle = product.defaultPairsPerBundle;
      const totalPairs = quantity * pairsPerBundle;
      const total = totalPairs * sizeBundle.pricePerPair;

      setItems([
        ...items,
        {
          id: itemId,
          productId: product.id,
          productName: product.name,
          articleNumber: product.articleNumber,
          brandName: product.brandName,
          sizeRange: sizeBundle.sizeRange,
          quantity,
          pairsPerBundle,
          pricePerPair: sizeBundle.pricePerPair,
          discountPerPair: 0,
          total,
        },
      ]);
    }
    setProductOpen(false);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      setRemoveItemId(id);
      return;
    }
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const totalPairs = quantity * item.pairsPerBundle;
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, quantity, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemPairs = (id: string, pairsPerBundle: number) => {
    if (pairsPerBundle < 1) return;
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const totalPairs = item.quantity * pairsPerBundle;
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, pairsPerBundle, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemDiscountPerPair = (id: string, discountPerPair: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const totalPairs = item.quantity * item.pairsPerBundle;
          const discountTotal = totalPairs * discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, discountPerPair, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const confirmRemoveItem = () => {
    if (removeItemId) {
      setItems(items.filter((item) => item.id !== removeItemId));
      setRemoveItemId(null);
    }
  };

  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.pairsPerBundle * item.pricePerPair,
      0
    );
    const totalDiscount = items.reduce(
      (sum, item) => sum + item.quantity * item.pairsPerBundle * item.discountPerPair,
      0
    );
    const afterDiscount = subtotal - totalDiscount;
    const tax = (afterDiscount * taxPercent) / 100;
    const total = afterDiscount + tax;
    const received = parseFloat(amountReceived) || 0;
    const balance = total - received;
    return { subtotal, totalDiscount, tax, total, received, balance };
  }, [items, taxPercent, amountReceived]);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">New Invoice</h2>
            <p className="text-muted-foreground">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button className="gap-2">
            <Send className="w-4 h-4" />
            Send Invoice
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Client Selection */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Client Information
            </h3>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  className="w-full justify-between h-auto py-3"
                >
                  {selectedClient ? (
                    <div className="text-left">
                      <p className="font-medium">{selectedClient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedClient.city} • Balance: Rs {selectedClient.currentBalance.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a client...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            setSelectedClient(client);
                            setClientOpen(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.city} • Balance: Rs {client.currentBalance.toLocaleString()}
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

          {/* Products */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Products
              </h3>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList className="max-h-[400px]">
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <div key={product.id} className="border-b last:border-b-0">
                            <div className="px-3 py-2 bg-muted/30">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.brandName} • {product.articleNumber} • Stock: {product.stockDozens * product.pairsPerDozen} pairs
                              </p>
                            </div>
                            <div className="p-2 grid grid-cols-3 gap-2">
                              {product.sizeBundles.map((sb) => (
                                <Button
                                  key={sb.sizeRange}
                                  variant="outline"
                                  size="sm"
                                  className="flex flex-col h-auto py-2"
                                  onClick={() => addProduct(product, sb)}
                                >
                                  <span className="font-medium">Size {sb.sizeRange}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Rs {sb.pricePerPair}/pair
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => {
                  const totalPairs = item.quantity * item.pairsPerBundle;
                  const discountTotal = totalPairs * item.discountPerPair;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.brandName} • {item.articleNumber} • Size {item.sizeRange}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => setRemoveItemId(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 gap-3 items-end">
                        <div>
                          <Label className="text-xs text-muted-foreground">Bundles</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(item.id, parseInt(e.target.value) || 0)
                              }
                              className="w-12 h-8 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Pairs/Bundle</Label>
                          <Input
                            type="number"
                            value={item.pairsPerBundle}
                            onChange={(e) =>
                              updateItemPairs(item.id, parseInt(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Rate ({totalPairs} × Rs {item.pricePerPair})
                          </Label>
                          <p className="font-medium mt-1 h-8 flex items-center">
                            Rs {(totalPairs * item.pricePerPair).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Discount/Pair (Rs)</Label>
                          <Input
                            type="number"
                            value={item.discountPerPair || ""}
                            onChange={(e) =>
                              updateItemDiscountPerPair(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                            placeholder="0"
                          />
                          {discountTotal > 0 && (
                            <p className="text-xs text-destructive mt-1">
                              Total: -Rs {discountTotal.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Label className="text-xs text-muted-foreground">Total</Label>
                          <p className="font-semibold text-lg mt-1">
                            Rs {item.total.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-lg">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No products added yet. Click "Add Product" to get started.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this invoice..."
              className="mt-2"
              rows={3}
            />
          </div>
        </motion.div>

        {/* Summary Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Calculations */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Summary
            </h3>

            <div className="space-y-4">
              {/* Tax */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tax Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-center"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs {calculations.subtotal.toLocaleString()}</span>
                </div>
                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Discount</span>
                    <span className="text-destructive">
                      - Rs {calculations.totalDiscount.toLocaleString()}
                    </span>
                  </div>
                )}
                {calculations.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                    <span>Rs {calculations.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">Rs {calculations.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Payment Method
            </h3>
            <div className="space-y-4">
              <Select
                value={paymentMethod}
                onValueChange={(value: "cash" | "account") => setPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                </SelectContent>
              </Select>

              {paymentMethod === "account" && (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Amount Received (Rs)</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0"
                />
              </div>

              {calculations.balance > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance Due</span>
                    <span className="font-semibold text-destructive">
                      Rs {calculations.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Remove Item Confirmation */}
      <AlertDialog open={!!removeItemId} onOpenChange={() => setRemoveItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this product from the invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewInvoice;
