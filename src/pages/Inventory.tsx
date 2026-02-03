import { useState, useMemo, useEffect, useRef } from "react";
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
  Settings2,
  Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Brand, Product, SizeBundlePricing } from "@/types";
import { useDefaultSizeRanges, ProductCategory } from "@/hooks/useDefaultSizeRanges";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { exportToCSV } from "@/utils/exportUtils";

interface SizeBundleInput {
  sizeRange: string;
  pricePerPair: string;
  pairsPerBundle: string;
  quantity: string; // New: quantity (bundles) for each size
  isCustom: boolean;
}

type GenderCategory = "men" | "women" | "children" | "unisex";

const GENDER_OPTIONS: { value: GenderCategory; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "children", label: "Children" },
  { value: "unisex", label: "Unisex" },
];

const Inventory = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<(Product & { gender: GenderCategory })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false);
  const [isSizeRangeDialogOpen, setIsSizeRangeDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [customSizeRange, setCustomSizeRange] = useState("");

  const { sizeRanges, getSizeRangesForCategory, addSizeRange, deleteSizeRange } = useDefaultSizeRanges();

  // Size range management
  const [newSizeRangeCategory, setNewSizeRangeCategory] = useState<ProductCategory>("men");
  const [newSizeRangeValue, setNewSizeRangeValue] = useState("");
  const [newSizeRangePairs, setNewSizeRangePairs] = useState("6");

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
    gender: "unisex" as GenderCategory,
    pairsPerDozen: "12",
    defaultPairsPerBundle: "6",
    supplier: "",
    sizeBundles: [] as SizeBundleInput[],
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (brandsError) throw brandsError;

      const formattedBrands: Brand[] = (brandsData || []).map((b) => ({
        id: b.id,
        name: b.name,
      }));
      setBrands(formattedBrands);

      // Fetch products with size bundles
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          brands (name),
          product_size_bundles (*)
        `)
        .order("article_number");

      if (productsError) throw productsError;

      const formattedProducts = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        articleNumber: p.article_number,
        brandId: p.brand_id || "",
        brandName: p.brands?.name || "Unknown",
        category: p.category,
        gender: p.gender as GenderCategory,
        stockDozens: p.stock_dozens,
        pairsPerDozen: p.pairs_per_dozen,
        sizeBundles: (p.product_size_bundles || []).map((sb: any) => ({
          sizeRange: sb.size_range,
          pricePerPair: sb.price_per_pair,
          pairsPerBundle: sb.pairs_per_bundle,
        })),
        defaultPairsPerBundle: 6,
        supplier: p.supplier || "",
      }));

      setProducts(formattedProducts);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category))];
  }, [products]);

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGender = genderFilter === "all" || product.gender === genderFilter;
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;

      return matchesSearch && matchesGender && matchesCategory;
    })
    .sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));

  const handleAddBrand = async () => {
    if (newBrandName.trim()) {
      try {
        const { error } = await supabase.from("brands").insert({ name: newBrandName.trim() });
        if (error) throw error;

        toast({ title: "Success", description: "Brand added successfully" });
        setNewBrandName("");
        setShowAddBrandConfirm(false);
        fetchData();
      } catch (error: any) {
        console.error("Error adding brand:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to add brand",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.articleNumber && newProduct.brandId) {
      try {
        // Calculate total stock from size bundles
        const totalDozens = newProduct.sizeBundles.reduce((sum, sb) => {
          const qty = parseInt(sb.quantity) || 0;
          const pairsPerBundle = parseInt(sb.pairsPerBundle) || 6;
          const pairsPerDozen = parseInt(newProduct.pairsPerDozen) || 12;
          return sum + (qty * pairsPerBundle) / pairsPerDozen;
        }, 0);

        // Insert product
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert({
            name: newProduct.name,
            article_number: newProduct.articleNumber,
            brand_id: newProduct.brandId,
            category: newProduct.category || "General",
            gender: newProduct.gender,
            stock_dozens: totalDozens,
            pairs_per_dozen: parseInt(newProduct.pairsPerDozen) || 12,
            supplier: newProduct.supplier || null,
          })
          .select()
          .single();

        if (productError) throw productError;

        // Insert size bundles
        const sizeBundleInserts = newProduct.sizeBundles
          .filter((sb) => sb.sizeRange && sb.pricePerPair)
          .map((sb) => ({
            product_id: productData.id,
            size_range: sb.sizeRange,
            price_per_pair: parseFloat(sb.pricePerPair) || 0,
            pairs_per_bundle: parseInt(sb.pairsPerBundle) || 6,
          }));

        if (sizeBundleInserts.length > 0) {
          const { error: bundleError } = await supabase
            .from("product_size_bundles")
            .insert(sizeBundleInserts);

          if (bundleError) throw bundleError;
        }

        // Log audit event
        await log({
          action: "create",
          entityType: "product",
          entityId: productData.id,
          details: {
            name: newProduct.name,
            article_number: newProduct.articleNumber,
            gender: newProduct.gender,
            size_bundles_count: sizeBundleInserts.length,
          },
        });

        toast({ title: "Success", description: "Product added successfully" });
        setNewProduct({
          name: "",
          articleNumber: "",
          brandId: "",
          category: "",
          gender: "unisex",
          pairsPerDozen: "12",
          defaultPairsPerBundle: "6",
          supplier: "",
          sizeBundles: [],
        });
        setShowAddProductConfirm(false);
        setIsAddProductDialogOpen(false);
        fetchData();
      } catch (error: any) {
        console.error("Error adding product:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to add product",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteProduct = async () => {
    if (deleteProductId) {
      try {
        // Get product info for logging
        const productToDelete = products.find(p => p.id === deleteProductId);
        
        // Delete size bundles first
        await supabase.from("product_size_bundles").delete().eq("product_id", deleteProductId);

        // Delete product
        const { error } = await supabase.from("products").delete().eq("id", deleteProductId);
        if (error) throw error;

        // Log audit event
        await log({
          action: "delete",
          entityType: "product",
          entityId: deleteProductId,
          details: {
            name: productToDelete?.name,
            article_number: productToDelete?.articleNumber,
          },
        });

        toast({ title: "Success", description: "Product deleted" });
        setDeleteProductId(null);
        fetchData();
      } catch (error: any) {
        console.error("Error deleting product:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete product",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteBrand = async () => {
    if (deleteBrandId) {
      try {
        const { error } = await supabase.from("brands").delete().eq("id", deleteBrandId);
        if (error) throw error;

        toast({ title: "Success", description: "Brand deleted" });
        setDeleteBrandId(null);
        fetchData();
      } catch (error: any) {
        console.error("Error deleting brand:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete brand",
          variant: "destructive",
        });
      }
    }
  };

  const getStockStatus = (stockDozens: number, pairsPerDozen: number) => {
    const totalPairs = stockDozens * pairsPerDozen;
    if (totalPairs <= 24)
      return { label: "Critical", class: "status-badge-danger" };
    if (totalPairs <= 60) return { label: "Low", class: "status-badge-warning" };
    return { label: "In Stock", class: "status-badge-success" };
  };

  const updateSizeBundlePrice = (index: number, price: string) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], pricePerPair: price };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const updateSizeBundleRange = (
    index: number,
    range: string,
    isCustom: boolean = false
  ) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], sizeRange: range, isCustom };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const updateSizeBundleQuantity = (index: number, quantity: string) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], quantity };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const addSizeBundle = () => {
    setNewProduct({
      ...newProduct,
      sizeBundles: [
        ...newProduct.sizeBundles,
        { sizeRange: "", pricePerPair: "", pairsPerBundle: newProduct.defaultPairsPerBundle || "6", quantity: "", isCustom: false },
      ],
    });
  };

  const removeSizeBundle = (index: number) => {
    const updated = newProduct.sizeBundles.filter((_, i) => i !== index);
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  const addCustomSizeBundle = () => {
    if (customSizeRange.trim()) {
      setNewProduct({
        ...newProduct,
        sizeBundles: [
          ...newProduct.sizeBundles,
          {
            sizeRange: customSizeRange.trim(),
            pricePerPair: "",
            pairsPerBundle: newProduct.defaultPairsPerBundle || "6",
            quantity: "",
            isCustom: true,
          },
        ],
      });
      setCustomSizeRange("");
    }
  };

  const updateSizeBundlePairs = (index: number, pairs: string) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], pairsPerBundle: pairs };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  // Add default size ranges based on gender selection
  const addDefaultSizeRangesForGender = (gender: GenderCategory) => {
    setNewProduct((prev) => ({ ...prev, gender }));
    
    // Get size ranges for selected gender
    const defaultRanges = getSizeRangesForCategory(gender as ProductCategory);
    
    if (defaultRanges.length > 0) {
      const newSizeBundles: SizeBundleInput[] = defaultRanges.map((sr) => ({
        sizeRange: sr.size_range,
        pricePerPair: "",
        pairsPerBundle: sr.pairs_per_bundle.toString(),
        quantity: "",
        isCustom: false,
      }));
      setNewProduct((prev) => ({
        ...prev,
        gender,
        sizeBundles: newSizeBundles,
      }));
    }
  };

  const handleAddDefaultSizeRange = async () => {
    if (newSizeRangeValue.trim()) {
      try {
        await addSizeRange(
          newSizeRangeCategory,
          newSizeRangeValue.trim(),
          parseInt(newSizeRangePairs) || 6
        );
        setNewSizeRangeValue("");
        setNewSizeRangePairs("6");
      } catch (error) {
        console.error("Failed to add size range:", error);
      }
    }
  };

  // Calculate total pairs from size bundles
  const totalStockPairs = useMemo(() => {
    return newProduct.sizeBundles.reduce((sum, sb) => {
      const qty = parseInt(sb.quantity) || 0;
      const pairs = parseInt(sb.pairsPerBundle) || 6;
      return sum + qty * pairs;
    }, 0);
  }, [newProduct.sizeBundles]);

  // Export inventory to CSV
  const handleExportInventory = () => {
    exportToCSV(
      filteredProducts,
      [
        { key: "articleNumber", header: "Article Number" },
        { key: "name", header: "Product Name" },
        { key: "brandName", header: "Brand" },
        { key: "category", header: "Category" },
        { key: "gender", header: "Gender" },
        { key: "stockDozens", header: "Stock (Dozens)" },
        { key: "pairsPerDozen", header: "Pairs/Dozen" },
        { 
          key: "sizeBundles", 
          header: "Size Ranges", 
          format: (bundles: SizeBundlePricing[]) => 
            bundles.map(b => `${b.sizeRange}: Rs${b.pricePerPair}`).join("; ")
        },
      ],
      "inventory"
    );
    
    log({
      action: "export",
      entityType: "product",
      details: { count: filteredProducts.length, type: "csv" },
    });
    
    toast({ title: "Success", description: "Inventory exported successfully" });
  };

  // Import inventory from CSV
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Invalid File",
          description: "CSV file must have headers and at least one data row",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Import Started",
        description: `Processing ${lines.length - 1} products...`,
      });

      // Parse CSV (basic implementation - assumes standard format)
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("product"));
      const articleIdx = headers.findIndex(h => h.includes("article") || h.includes("sku"));
      const brandIdx = headers.findIndex(h => h.includes("brand"));

      if (nameIdx === -1 || articleIdx === -1) {
        toast({
          title: "Invalid Format",
          description: "CSV must have 'Product Name' and 'Article Number' columns",
          variant: "destructive",
        });
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
        const name = values[nameIdx];
        const articleNumber = values[articleIdx];
        
        if (!name || !articleNumber) continue;

        // Find or create brand
        let brandId = null;
        if (brandIdx !== -1 && values[brandIdx]) {
          const brandName = values[brandIdx];
          const existingBrand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
          if (existingBrand) {
            brandId = existingBrand.id;
          }
        }

        const { error } = await supabase.from("products").insert({
          name,
          article_number: articleNumber,
          brand_id: brandId,
          category: "Imported",
          gender: "unisex",
        });

        if (!error) imported++;
      }

      log({
        action: "import",
        entityType: "product",
        details: { count: imported, filename: file.name },
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${imported} products`,
      });

      fetchData();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }

    // Reset input
    e.target.value = "";
  };

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
          <h2 className="text-2xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your products, brands, and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Size Range Management */}
          <Dialog open={isSizeRangeDialogOpen} onOpenChange={setIsSizeRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Size Ranges
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Default Size Ranges</DialogTitle>
                <DialogDescription>
                  Manage default size ranges for Men, Women, and Children
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="men" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="men">Men</TabsTrigger>
                  <TabsTrigger value="women">Women</TabsTrigger>
                  <TabsTrigger value="children">Children</TabsTrigger>
                </TabsList>
                {(["men", "women", "children"] as ProductCategory[]).map((cat) => (
                  <TabsContent key={cat} value={cat} className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., 7-10"
                        value={newSizeRangeCategory === cat ? newSizeRangeValue : ""}
                        onChange={(e) => {
                          setNewSizeRangeCategory(cat);
                          setNewSizeRangeValue(e.target.value);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Pairs"
                        value={newSizeRangeCategory === cat ? newSizeRangePairs : "6"}
                        onChange={(e) => {
                          setNewSizeRangeCategory(cat);
                          setNewSizeRangePairs(e.target.value);
                        }}
                        className="w-20"
                      />
                      <Button onClick={handleAddDefaultSizeRange}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {getSizeRangesForCategory(cat).map((sr) => (
                        <div
                          key={sr.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <span className="font-medium">Size {sr.size_range}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({sr.pairs_per_bundle} pairs/bundle)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteSizeRange(sr.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {getSizeRangesForCategory(cat).length === 0 && (
                        <p className="text-center text-muted-foreground py-4 text-sm">
                          No size ranges configured for {cat}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Brand Management Dialog */}
          <Dialog
            open={isAddBrandDialogOpen}
            onOpenChange={setIsAddBrandDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tag className="w-4 h-4" />
                Brands
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && setShowAddBrandConfirm(true)
                    }
                  />
                  <Button
                    onClick={() => setShowAddBrandConfirm(true)}
                    disabled={!newBrandName.trim()}
                  >
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

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImportClick}>
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportInventory}>
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Add Product Dialog */}
          <Dialog
            open={isAddProductDialogOpen}
            onOpenChange={setIsAddProductDialogOpen}
          >
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
                  Enter the product details with size bundle pricing and quantities.
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
                        setNewProduct({
                          ...newProduct,
                          articleNumber: e.target.value,
                        })
                      }
                      placeholder="e.g., CC-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label>Gender/Type</Label>
                    <Select
                      value={newProduct.gender}
                      onValueChange={(value: GenderCategory) =>
                        addDefaultSizeRangesForGender(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pairsPerBundle">Default Pairs per Bundle</Label>
                    <Input
                      id="pairsPerBundle"
                      type="number"
                      value={newProduct.defaultPairsPerBundle}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          defaultPairsPerBundle: e.target.value,
                        })
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
                </div>

                {/* Size Bundle Pricing with Quantity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Size Bundle Pricing & Quantity
                    </Label>
                    {newProduct.gender !== "unisex" && (
                      <span className="text-xs text-muted-foreground">
                        Default sizes loaded for {newProduct.gender}
                      </span>
                    )}
                  </div>

                  {/* Existing Size Bundles */}
                  <div className="space-y-3">
                    {newProduct.sizeBundles.map((sb, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Size Range
                            </Label>
                            <Input
                              value={sb.sizeRange}
                              onChange={(e) =>
                                updateSizeBundleRange(index, e.target.value, true)
                              }
                              placeholder="e.g., 7-10"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Price/Pair (Rs)
                            </Label>
                            <Input
                              type="number"
                              value={sb.pricePerPair}
                              onChange={(e) =>
                                updateSizeBundlePrice(index, e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                          <div className="w-20 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Pairs/Bundle
                            </Label>
                            <Input
                              type="number"
                              value={sb.pairsPerBundle}
                              onChange={(e) =>
                                updateSizeBundlePairs(index, e.target.value)
                              }
                              placeholder="6"
                            />
                          </div>
                          <div className="w-24 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Qty (Bundles)
                            </Label>
                            <Input
                              type="number"
                              value={sb.quantity}
                              onChange={(e) =>
                                updateSizeBundleQuantity(index, e.target.value)
                              }
                              placeholder="0"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive hover:text-destructive"
                            onClick={() => removeSizeBundle(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {sb.quantity && parseInt(sb.quantity) > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            = {parseInt(sb.quantity) * (parseInt(sb.pairsPerBundle) || 6)} pairs
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total Stock */}
                  {totalStockPairs > 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-foreground">
                        Total Stock: <span className="text-primary">{totalStockPairs} pairs</span>
                        <span className="text-muted-foreground ml-2">
                          ({(totalStockPairs / (parseInt(newProduct.pairsPerDozen) || 12)).toFixed(1)} dozens)
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Add Bundle Button - Below list */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Add Custom Size Range
                      </Label>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSizeBundle}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Size Bundle
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddProductDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowAddProductConfirm(true)}>
                  Add Product
                </Button>
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
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {GENDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <th>Type</th>
                <th>Size Pricing (Rs/pair)</th>
                <th>Stock (Dozens)</th>
                <th>Total Pairs</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const totalPairs = product.stockDozens * product.pairsPerDozen;
                const stockStatus = getStockStatus(
                  product.stockDozens,
                  product.pairsPerDozen
                );
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
                      <span className="text-xs capitalize text-muted-foreground">
                        {product.gender}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        {product.sizeBundles.map((sb) => (
                          <span key={sb.sizeRange} className="text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {sb.sizeRange}:
                            </span>{" "}
                            Rs {sb.pricePerPair} ({sb.pairsPerBundle}p)
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
              Try adjusting your search or add new products.
            </p>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showAddProductConfirm} onOpenChange={setShowAddProductConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{newProduct.name}" to your inventory?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddProduct}>
              Add Product
            </AlertDialogAction>
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

      <AlertDialog
        open={deleteProductId !== null}
        onOpenChange={() => setDeleteProductId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteBrandId !== null}
        onOpenChange={() => setDeleteBrandId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this brand? Products using this
              brand will remain but show as "Unknown".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrand}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
