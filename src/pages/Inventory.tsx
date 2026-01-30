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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Brand, Product, SizeBundlePricing } from "@/types";
import { initialBrands, initialProducts } from "@/data/mockData";

const Inventory = () => {
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    articleNumber: "",
    brandId: "",
    category: "",
    stock: "",
    defaultPairsPerBundle: "6",
    supplier: "",
    sizeBundles: [
      { sizeRange: "7-10" as const, pricePerPair: "" },
      { sizeRange: "4-6" as const, pricePerPair: "" },
      { sizeRange: "1-3" as const, pricePerPair: "" },
    ],
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
      setIsAddBrandDialogOpen(false);
    }
  };

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.articleNumber && newProduct.brandId) {
      const selectedBrand = brands.find((b) => b.id === newProduct.brandId);
      const sizeBundles: SizeBundlePricing[] = newProduct.sizeBundles.map((sb) => ({
        sizeRange: sb.sizeRange,
        pricePerPair: parseFloat(sb.pricePerPair as string) || 0,
      }));

      const product: Product = {
        id: Date.now().toString(),
        name: newProduct.name,
        articleNumber: newProduct.articleNumber,
        brandId: newProduct.brandId,
        brandName: selectedBrand?.name || "Unknown",
        category: newProduct.category || "Uncategorized",
        stock: parseInt(newProduct.stock) || 0,
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
        stock: "",
        defaultPairsPerBundle: "6",
        supplier: "",
        sizeBundles: [
          { sizeRange: "7-10", pricePerPair: "" },
          { sizeRange: "4-6", pricePerPair: "" },
          { sizeRange: "1-3", pricePerPair: "" },
        ],
      });
      setIsAddProductDialogOpen(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleDeleteBrand = (id: string) => {
    setBrands(brands.filter((b) => b.id !== id));
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 5) return { label: "Critical", class: "status-badge-danger" };
    if (stock <= 15) return { label: "Low", class: "status-badge-warning" };
    return { label: "In Stock", class: "status-badge-success" };
  };

  const updateSizeBundlePrice = (sizeRange: string, price: string) => {
    setNewProduct({
      ...newProduct,
      sizeBundles: newProduct.sizeBundles.map((sb) =>
        sb.sizeRange === sizeRange ? { ...sb, pricePerPair: price } : sb
      ),
    });
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
                    onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                  />
                  <Button onClick={handleAddBrand}>Add</Button>
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
                        onClick={() => handleDeleteBrand(brand.id)}
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock (Bundles)</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, stock: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pairsPerBundle">Pairs per Bundle</Label>
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
                  <Label className="text-base font-semibold">Size Bundle Pricing (Rs per pair)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {newProduct.sizeBundles.map((sb) => (
                      <div key={sb.sizeRange} className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Size {sb.sizeRange}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            Rs
                          </span>
                          <Input
                            type="number"
                            value={sb.pricePerPair}
                            onChange={(e) =>
                              updateSizeBundlePrice(sb.sizeRange, e.target.value)
                            }
                            className="pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct}>Add Product</Button>
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
                <th>Stock</th>
                <th>Pairs/Bundle</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const stockStatus = getStockStatus(product.stock);
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
                        <span className="font-medium">{product.stock}</span>
                        <span className={cn("status-badge", stockStatus.class)}>
                          {stockStatus.label}
                        </span>
                      </div>
                    </td>
                    <td className="font-medium">{product.defaultPairsPerBundle}</td>
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
                            onClick={() => handleDeleteProduct(product.id)}
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
    </div>
  );
};

export default Inventory;
