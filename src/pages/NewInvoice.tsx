import { useState, useMemo, useRef } from "react";
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
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [productSearch, setProductSearch] = useState("");
  
  // Multi-size selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [bundleQuantity, setBundleQuantity] = useState(1);

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
      const totalPairs = newQuantity * sizeBundle.pairsPerBundle;
      const discountTotal = totalPairs * existingItem.discountPerPair;
      const total = totalPairs * existingItem.pricePerPair - discountTotal;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        totalPairs,
        total: Math.max(0, total),
      };
      setItems(updatedItems);
    } else {
      // Add new item
      const itemId = `${product.id}-${sizeBundle.sizeRange}-${Date.now()}`;
      const quantity = 1;
      const totalPairs = sizeBundle.pairsPerBundle;
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
          totalPairs,
          pricePerPair: sizeBundle.pricePerPair,
          discountPerPair: 0,
          total,
        },
      ]);
    }
  };

  const addMultipleSizes = () => {
    if (!selectedProduct || selectedSizes.length === 0) return;
    
    selectedSizes.forEach((sizeRange) => {
      const sizeBundle = selectedProduct.sizeBundles.find((sb) => sb.sizeRange === sizeRange);
      if (sizeBundle) {
        for (let i = 0; i < bundleQuantity; i++) {
          addProduct(selectedProduct, sizeBundle);
        }
      }
    });

    // Reset and keep product picker open for easy addition
    setSelectedProduct(null);
    setSelectedSizes([]);
    setBundleQuantity(1);
    setProductOpen(false);
    
    // Auto-focus search for next product
    setTimeout(() => {
      setProductOpen(true);
    }, 100);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      setRemoveItemId(id);
      return;
    }
    setItems(
      items.map((item) => {
        if (item.id === id) {
          // Keep same pairs per bundle ratio
          const pairsPerBundle = Math.ceil(item.totalPairs / item.quantity);
          const totalPairs = quantity * pairsPerBundle;
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, quantity, totalPairs, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemTotalPairs = (id: string, totalPairs: number) => {
    if (totalPairs < 1) return;
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const discountTotal = totalPairs * item.discountPerPair;
          const total = totalPairs * item.pricePerPair - discountTotal;
          return { ...item, totalPairs, total: Math.max(0, total) };
        }
        return item;
      })
    );
  };

  const updateItemDiscountPerPair = (id: string, discountPerPair: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const discountTotal = item.totalPairs * discountPerPair;
          const total = item.totalPairs * item.pricePerPair - discountTotal;
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
      (sum, item) => sum + item.totalPairs * item.pricePerPair,
      0
    );
    const totalDiscount = items.reduce(
      (sum, item) => sum + item.totalPairs * item.discountPerPair,
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

  const toggleSizeSelection = (sizeRange: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeRange)
        ? prev.filter((s) => s !== sizeRange)
        : [...prev, sizeRange]
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">New Invoice</h2>
            <p className="text-muted-foreground text-sm">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button size="sm" className="gap-2 flex-1 sm:flex-none">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
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
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
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
              <PopoverContent className="w-[350px] sm:w-[400px] p-0" align="start">
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
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Products
            </h3>

            {/* Items List */}
            {items.length > 0 ? (
              <div className="space-y-3 mb-4">
                {items.map((item) => {
                  const discountTotal = item.totalPairs * item.discountPerPair;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
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
                          <Label className="text-xs text-muted-foreground">Total Pairs</Label>
                          <Input
                            type="number"
                            value={item.totalPairs}
                            onChange={(e) =>
                              updateItemTotalPairs(item.id, parseInt(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Disc/Pair (Rs)</Label>
                          <Input
                            type="number"
                            value={item.discountPerPair || ""}
                            onChange={(e) =>
                              updateItemDiscountPerPair(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 mt-1"
                            placeholder="0"
                          />
                        </div>
                        <div className="text-right">
                          <Label className="text-xs text-muted-foreground">Total</Label>
                          <p className="font-semibold text-base sm:text-lg mt-1">
                            Rs {item.total.toLocaleString()}
                          </p>
                          {discountTotal > 0 && (
                            <p className="text-xs text-destructive">
                              -Rs {discountTotal.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-border rounded-lg mb-4">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No products added yet. Click "Add Product" below.
                </p>
              </div>
            )}

            {/* Add Product Button - Below items */}
            <Popover open={productOpen} onOpenChange={setProductOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] sm:w-[500px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search products by name or article..." 
                    value={productSearch}
                    onValueChange={setProductSearch}
                    ref={searchInputRef}
                  />
                  <CommandList className="max-h-[400px]">
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {products
                        .sort((a, b) => a.articleNumber.localeCompare(b.articleNumber))
                        .map((product) => (
                        <div key={product.id} className="border-b last:border-b-0">
                          <div 
                            className={cn(
                              "px-3 py-2 cursor-pointer transition-colors",
                              selectedProduct?.id === product.id ? "bg-primary/10" : "bg-muted/30 hover:bg-muted/50"
                            )}
                            onClick={() => {
                              if (selectedProduct?.id === product.id) {
                                setSelectedProduct(null);
                                setSelectedSizes([]);
                              } else {
                                setSelectedProduct(product);
                                setSelectedSizes([]);
                              }
                            }}
                          >
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.brandName} • {product.articleNumber} • Stock: {product.stockDozens * product.pairsPerDozen} pairs
                            </p>
                          </div>
                          
                          {selectedProduct?.id === product.id && (
                            <div className="p-3 space-y-3 bg-background">
                              <div className="grid grid-cols-3 gap-2">
                                {product.sizeBundles.map((sb) => (
                                  <div
                                    key={sb.sizeRange}
                                    onClick={() => toggleSizeSelection(sb.sizeRange)}
                                    className={cn(
                                      "flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors",
                                      selectedSizes.includes(sb.sizeRange)
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    {selectedSizes.includes(sb.sizeRange) && (
                                      <Check className="w-3 h-3 text-primary absolute top-1 right-1" />
                                    )}
                                    <span className="font-medium text-sm">Size {sb.sizeRange}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Rs {sb.pricePerPair}/pair
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({sb.pairsPerBundle} pairs/bundle)
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              {selectedSizes.length > 0 && (
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <Label className="text-xs">Bundles per size</Label>
                                    <Input
                                      type="number"
                                      value={bundleQuantity}
                                      onChange={(e) => setBundleQuantity(parseInt(e.target.value) || 1)}
                                      min={1}
                                      className="h-8"
                                    />
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={addMultipleSizes}
                                    className="mt-4"
                                  >
                                    Add {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
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
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
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
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
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
