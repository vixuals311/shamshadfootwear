import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Package,
  MoreHorizontal,
  Tag,
  X,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Brand, Product, SizeBundlePricing, DEFAULT_SIZE_BUNDLES } from "@/types";
import { initialBrands, initialProducts } from "@/data/mockData";

interface SizeBundleInput {
  sizeRange: string;
  pricePerPair: string;
  isCustom: boolean;
}

const Inventory = () => {
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [customSizeRange, setCustomSizeRange] = useState("");
  
  // Confirmation dialogs
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [showAddProductConfirm, setShowAddProductConfirm] = useState(false);
  const [showAddBrandConfirm, setShowAddBrandConfirm] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    articleNumber: "",
    brandId: "",
    category: "",
    stockDozens: "",
    pairsPerDozen: "12",
    defaultPairsPerBundle: "6",
    supplier: "",
    sizeBundles: [{ sizeRange: "7-10", pricePerPair: "", isCustom: false }] as SizeBundleInput[],
  });

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddBrand = () => {
    if (newBrandName.trim()) {
      const newBrand: Brand = {
        id: Date.now().toString(),
        name: newBrandName.trim(),
      };
      setBrands([...brands, newBrand]);
      setNewBrandName("");
      setShowAddBrandConfirm(false);
    }
  };

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.articleNumber && newProduct.brandId) {
      const selectedBrand = brands.find((b) => b.id === newProduct.brandId);
      const sizeBundles: SizeBundlePricing[] = newProduct.sizeBundles
        .filter(sb => sb.sizeRange && sb.pricePerPair)
        .map((sb) => ({
          sizeRange: sb.sizeRange,
          pricePerPair: parseFloat(sb.pricePerPair) || 0,
        }));

      const product: Product = {
        id: Date.now().toString(),
        name: newProduct.name,
        articleNumber: newProduct.articleNumber,
        brandId: newProduct.brandId,
        brandName: selectedBrand?.name || "Unknown",
        category: newProduct.category || "Uncategorized",
        stockDozens: parseInt(newProduct.stockDozens) || 0,
        pairsPerDozen: parseInt(newProduct.pairsPerDozen) || 12,
        sizeBundles,
        defaultPairsPerBundle: parseInt(newProduct.defaultPairsPerBundle) || 6,
        supplier: newProduct.supplier || "N/A",
      };
      setProducts([product, ...products]);
      setNewProduct({
        name: "",
        articleNumber: "",
        brandId: "",
        category: "",
        stockDozens: "",
        pairsPerDozen: "12",
        defaultPairsPerBundle: "6",
        supplier: "",
        sizeBundles: [{ sizeRange: "7-10", pricePerPair: "", isCustom: false }],
      });
      setShowAddProductConfirm(false);
      setIsAddProductDialogOpen(false);
    }
  };

  const handleDeleteProduct = () => {
    if (deleteProductId) {
      setProducts(products.filter((p) => p.id !== deleteProductId));
      setDeleteProductId(null);
    }
  };

  const handleDeleteBrand = () => {
    if (deleteBrandId) {
      setBrands(brands.filter((b) => b.id !== deleteBrandId));
      setDeleteBrandId(null);
    }
  };

  const getStockStatus = (stockDozens: number, pairsPerDozen: number) => {
    const totalPairs = stockDozens * pairsPerDozen;
    if (totalPairs <= 24) return { label: "Critical", class: "status-badge-danger" };
    if (totalPairs <= 60) return { label: "Low", class: "status-badge-warning" };
    return { label: "In Stock", class: "status-badge-success" };
  };

  const updateSizeBundlePrice = (index: number, price: string) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], pricePerPair: price };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const updateSizeBundleRange = (index: number, range: string, isCustom: boolean = false) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], sizeRange: range, isCustom };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const addSizeBundle = () => {
    setNewProduct({
      ...newProduct,
      sizeBundles: [...newProduct.sizeBundles, { sizeRange: "", pricePerPair: "", isCustom: false }],
    });
  };

  const removeSizeBundle = (index: number) => {
    if (newProduct.sizeBundles.length > 1) {
      const updated = newProduct.sizeBundles.filter((_, i) => i !== index);
      setNewProduct({ ...newProduct, sizeBundles: updated });
    }
  };

  const addCustomSizeBundle = () => {
    if (customSizeRange.trim()) {
      setNewProduct({
        ...newProduct,
        sizeBundles: [...newProduct.sizeBundles, { sizeRange: customSizeRange.trim(), pricePerPair: "", isCustom: true }],
      });
      setCustomSizeRange("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your products, brands, and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand Management Dialog */}
          <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tag className="w-4 h-4" />
                Manage Brands
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manage Brands</DialogTitle>
                <DialogDescription>
                  Add or remove brands for your products.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter brand name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setShowAddBrandConfirm(true)}
                  />
                  <Button onClick={() => setShowAddBrandConfirm(true)} disabled={!newBrandName.trim()}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="font-medium">{brand.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteBrandId(brand.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Add Product Dialog */}
          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Enter the product details with size bundle pricing.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="articleNumber">Article Number / SKU</Label>
                    <Input
                      id="articleNumber"
                      value={newProduct.articleNumber}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, articleNumber: e.target.value })
                      }
                      placeholder="e.g., CC-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Select
                      value={newProduct.brandId}
                      onValueChange={(value) =>
                        setNewProduct({ ...newProduct, brandId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, category: e.target.value })
                      }
                      placeholder="e.g., Shoes, Sandals"
                    />
                  </div>
                </div>

                {/* Stock in Dozens */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <Label className="text-base font-semibold mb-3 block">Stock Quantity</Label>
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="stockDozens" className="text-sm text-muted-foreground">
                        Quantity (Dozens)
                      </Label>
                      <Input
                        id="stockDozens"
                        type="number"
                        value={newProduct.stockDozens}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, stockDozens: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pairsPerDozen" className="text-sm text-muted-foreground">
                        Pairs per Dozen
                      </Label>
                      <Input
                        id="pairsPerDozen"
                        type="number"
                        value={newProduct.pairsPerDozen}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, pairsPerDozen: e.target.value })
                        }
                        placeholder="12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Total Pairs</Label>
                      <div className="h-10 px-3 py-2 rounded-md border border-input bg-background flex items-center font-semibold text-primary">
                        {(parseInt(newProduct.stockDozens) || 0) * (parseInt(newProduct.pairsPerDozen) || 12)} pairs
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pairsPerBundle">Default Pairs per Bundle</Label>
                  <Input
                    id="pairsPerBundle"
                    type="number"
                    value={newProduct.defaultPairsPerBundle}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, defaultPairsPerBundle: e.target.value })
                    }
                    placeholder="6"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={newProduct.supplier}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, supplier: e.target.value })
                    }
                    placeholder="Enter supplier name"
                  />
                </div>

                {/* Size Bundle Pricing */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Size Bundle Pricing (Rs per pair)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSizeBundle} className="gap-1">
                      <Plus className="w-3 h-3" />
                      Add Bundle
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {newProduct.sizeBundles.map((sb, index) => (
                      <div key={index} className="flex items-end gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs text-muted-foreground">Size Range</Label>
                          {sb.isCustom ? (
                            <Input
                              value={sb.sizeRange}
                              onChange={(e) => updateSizeBundleRange(index, e.target.value, true)}
                              placeholder="e.g., 11-13"
                            />
                          ) : (
                            <Select
                              value={sb.sizeRange}
                              onValueChange={(value) => updateSizeBundleRange(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select size range" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_SIZE_BUNDLES.map((size) => (
                                  <SelectItem key={size} value={size}>
                                    Size {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs text-muted-foreground">Price per Pair</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              Rs
                            </span>
                            <Input
                              type="number"
                              value={sb.pricePerPair}
                              onChange={(e) => updateSizeBundlePrice(index, e.target.value)}
                              className="pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        {newProduct.sizeBundles.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive hover:text-destructive"
                            onClick={() => removeSizeBundle(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Custom Size Bundle */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Add Custom Size Range</Label>
                      <Input
                        value={customSizeRange}
                        onChange={(e) => setCustomSizeRange(e.target.value)}
                        placeholder="e.g., 11-13"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addCustomSizeBundle}
                      disabled={!customSizeRange.trim()}
                    >
                      Add Custom
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowAddProductConfirm(true)}>Add Product</Button>
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
            placeholder="Search by name, article number, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Article #</th>
                <th>Brand</th>
                <th>Size Pricing (Rs/pair)</th>
                <th>Stock (Dozens)</th>
                <th>Total Pairs</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const totalPairs = product.stockDozens * product.pairsPerDozen;
                const stockStatus = getStockStatus(product.stockDozens, product.pairsPerDozen);
                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="group"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground block">
                            {product.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground font-mono text-sm">
                      {product.articleNumber}
                    </td>
                    <td>
                      <span className="status-badge status-badge-default">
                        {product.brandName}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        {product.sizeBundles.map((sb) => (
                          <span key={sb.sizeRange} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{sb.sizeRange}:</span> Rs {sb.pricePerPair}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.stockDozens}</span>
                        <span className="text-xs text-muted-foreground">
                          (×{product.pairsPerDozen})
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{totalPairs}</span>
                        <span className={cn("status-badge", stockStatus.class)}>
                          {stockStatus.label}
                        </span>
                      </div>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                            onClick={() => setDeleteProductId(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No products found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or add a new product.
            </p>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBrandId} onOpenChange={() => setDeleteBrandId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this brand? Products using this brand will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBrand} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAddProductConfirm} onOpenChange={setShowAddProductConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{newProduct.name}" to inventory?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddProduct}>Add Product</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAddBrandConfirm} onOpenChange={setShowAddBrandConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{newBrandName}" as a new brand?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddBrand}>Add Brand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
