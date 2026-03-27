import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Check,
  ChevronsUpDown,
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
  DollarSign,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";

interface SizeBundleInput {
  sizeRange: string;
  pricePerPair: string;
  pairsPerBundle: string;
  quantity: string; // New: quantity (bundles) for each size
  isCustom: boolean;
}

interface RestockBundle {
  id: string;
  sizeRange: string;
  currentQty: number;
  addQty: string;
  pairsPerBundle: number;
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
  const { role } = useSupabaseAuthContext();
  const isAdmin = role === "admin";
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
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const { sizeRanges, getSizeRangesForCategory, sortBySizeRangeOrder, addSizeRange, deleteSizeRange } = useDefaultSizeRanges();

  // Size range management
  const [newSizeRangeCategory, setNewSizeRangeCategory] = useState<ProductCategory>("men");
  const [newSizeRangeValue, setNewSizeRangeValue] = useState("");
  const [newSizeRangePairs, setNewSizeRangePairs] = useState("6");

  // Confirmation dialogs
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [showAddProductConfirm, setShowAddProductConfirm] = useState(false);
  const [showAddBrandConfirm, setShowAddBrandConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { gender: GenderCategory }) | null>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);

  // Restock dialog
  const [restockProduct, setRestockProduct] = useState<(Product & { gender: GenderCategory }) | null>(null);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [restockBundles, setRestockBundles] = useState<RestockBundle[]>([]);
  const [restockSaving, setRestockSaving] = useState(false);

  // Cost price dialog (admin only)
  const [costPriceProduct, setCostPriceProduct] = useState<(Product & { gender: GenderCategory }) | null>(null);
  const [isCostPriceDialogOpen, setIsCostPriceDialogOpen] = useState(false);
  const [costPriceInputs, setCostPriceInputs] = useState<{ id: string; sizeRange: string; costPerPair: string; sellingPrice: number }[]>([]);
  const [costPriceSaving, setCostPriceSaving] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    articleNumber: "",
    brandId: "",
    category: "",
    gender: "unisex" as GenderCategory,
    pairsPerDozen: "12",
    defaultPairsPerBundle: "6",
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
        sizeBundles: sortBySizeRangeOrder((p.product_size_bundles || []).map((sb: any) => ({
            id: sb.id,
            sizeRange: sb.size_range,
            pricePerPair: sb.price_per_pair,
            pairsPerBundle: sb.pairs_per_bundle,
            quantity: sb.quantity ?? 0,
            costPerPair: sb.cost_per_pair ?? null,
          }))) as any[],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeRanges]);

  // Fetch existing categories for combobox
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("products").select("category");
      if (data) {
        const unique = [...new Set(data.map((p) => p.category).filter(Boolean))].sort();
        setExistingCategories(unique);
      }
    };
    fetchCategories();
  }, [products]);

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
            quantity: parseInt(sb.quantity) || 0,
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

  // Open edit product dialog
  const handleEditProduct = (product: Product & { gender: GenderCategory }) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      articleNumber: product.articleNumber,
      brandId: product.brandId,
      category: product.category,
      gender: product.gender,
      pairsPerDozen: product.pairsPerDozen.toString(),
      defaultPairsPerBundle: "6",
      
      sizeBundles: product.sizeBundles.map((sb: any) => ({
        sizeRange: sb.sizeRange,
        pricePerPair: sb.pricePerPair.toString(),
        pairsPerBundle: sb.pairsPerBundle.toString(),
        quantity: (sb.quantity ?? 0).toString(),
        isCustom: false,
      })),
    });
    setIsEditProductDialogOpen(true);
  };

  // Save edited product
  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;
    
    try {
      // Update product
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: newProduct.name,
          article_number: newProduct.articleNumber,
          brand_id: newProduct.brandId,
          category: newProduct.category || "General",
          gender: newProduct.gender,
          pairs_per_dozen: parseInt(newProduct.pairsPerDozen) || 12,
          
        })
        .eq("id", editingProduct.id);

      if (productError) throw productError;

      // Delete existing size bundles
      await supabase.from("product_size_bundles").delete().eq("product_id", editingProduct.id);

      // Insert updated size bundles
      const sizeBundleInserts = newProduct.sizeBundles
        .filter((sb) => sb.sizeRange && sb.pricePerPair)
        .map((sb) => ({
          product_id: editingProduct.id,
          size_range: sb.sizeRange,
          price_per_pair: parseFloat(sb.pricePerPair) || 0,
          pairs_per_bundle: parseInt(sb.pairsPerBundle) || 6,
          quantity: parseInt(sb.quantity) || 0,
        }));

      if (sizeBundleInserts.length > 0) {
        const { error: bundleError } = await supabase
          .from("product_size_bundles")
          .insert(sizeBundleInserts);

        if (bundleError) throw bundleError;
      }

      // Log audit event
      await log({
        action: "update",
        entityType: "product",
        entityId: editingProduct.id,
        details: {
          name: newProduct.name,
          article_number: newProduct.articleNumber,
          gender: newProduct.gender,
        },
      });

      toast({ title: "Success", description: "Product updated successfully" });
      setEditingProduct(null);
      setIsEditProductDialogOpen(false);
      setNewProduct({
        name: "",
        articleNumber: "",
        brandId: "",
        category: "",
        gender: "unisex",
        pairsPerDozen: "12",
        defaultPairsPerBundle: "6",
        sizeBundles: [],
      });
      fetchData();
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const getStockStatus = (product: { sizeBundles: any[] }) => {
    const totalPairs = product.sizeBundles.reduce(
      (sum: number, sb: any) => sum + (sb.quantity ?? 0) * (sb.pairsPerBundle ?? 6),
      0
    );
    if (totalPairs <= 24)
      return { label: "Critical", class: "status-badge-danger" };
    if (totalPairs <= 60) return { label: "Low", class: "status-badge-warning" };
    return { label: "In Stock", class: "status-badge-success" };
  };

  // Restock handlers
  const handleOpenRestock = (product: Product & { gender: GenderCategory }) => {
    setRestockProduct(product);
    setRestockBundles(
      product.sizeBundles.map((sb: any) => ({
        id: sb.id,
        sizeRange: sb.sizeRange,
        currentQty: sb.quantity ?? 0,
        addQty: "",
        pairsPerBundle: sb.pairsPerBundle,
      }))
    );
    setIsRestockDialogOpen(true);
  };

  const handleSaveRestock = async () => {
    if (!restockProduct) return;
    setRestockSaving(true);
    try {
      for (const bundle of restockBundles) {
        const addQty = parseInt(bundle.addQty) || 0;
        if (addQty > 0) {
          const newQty = bundle.currentQty + addQty;
          await supabase
            .from("product_size_bundles")
            .update({ quantity: newQty })
            .eq("id", bundle.id);
        }
      }

      // Update product stock_dozens for backward compat
      const totalNewPairs = restockBundles.reduce((sum, b) => {
        const addQty = parseInt(b.addQty) || 0;
        return sum + addQty * b.pairsPerBundle;
      }, 0);

      if (totalNewPairs > 0) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_dozens, pairs_per_dozen")
          .eq("id", restockProduct.id)
          .single();

        if (product) {
          const currentTotalPairs = product.stock_dozens * product.pairs_per_dozen;
          const newDozens = (currentTotalPairs + totalNewPairs) / product.pairs_per_dozen;
          await supabase
            .from("products")
            .update({ stock_dozens: newDozens })
            .eq("id", restockProduct.id);
        }
      }

      await log({
        action: "update",
        entityType: "product",
        entityId: restockProduct.id,
        details: {
          action: "restock",
          name: restockProduct.name,
          bundles_added: restockBundles.filter(b => parseInt(b.addQty) > 0).length,
        },
      });

      toast({ title: "Success", description: "Stock updated successfully" });
      setIsRestockDialogOpen(false);
      setRestockProduct(null);
      fetchData();
    } catch (error: any) {
      console.error("Error restocking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setRestockSaving(false);
    }
  };

  const updateSizeBundlePrice = (index: number, price: string) => {
    const updated = [...newProduct.sizeBundles];
    updated[index] = { ...updated[index], pricePerPair: price };
    setNewProduct({ ...newProduct, sizeBundles: updated });
  };

  // Cost price handlers (admin only)
  const handleOpenCostPrice = (product: Product & { gender: GenderCategory }) => {
    setCostPriceProduct(product);
    setCostPriceInputs(
      product.sizeBundles.map((sb: any) => ({
        id: sb.id,
        sizeRange: sb.sizeRange,
        costPerPair: sb.costPerPair !== null ? sb.costPerPair.toString() : "",
        sellingPrice: sb.pricePerPair,
      }))
    );
    setIsCostPriceDialogOpen(true);
  };

  const handleSaveCostPrice = async () => {
    if (!costPriceProduct) return;
    setCostPriceSaving(true);
    try {
      for (const input of costPriceInputs) {
        const costValue = input.costPerPair ? parseFloat(input.costPerPair) : null;
        await supabase
          .from("product_size_bundles")
          .update({ cost_per_pair: costValue })
          .eq("id", input.id);
      }

      await log({
        action: "update",
        entityType: "product",
        entityId: costPriceProduct.id,
        details: {
          action: "set_cost_price",
          name: costPriceProduct.name,
        },
      });

      toast({ title: "Success", description: "Cost prices updated successfully" });
      setIsCostPriceDialogOpen(false);
      setCostPriceProduct(null);
      fetchData();
    } catch (error: any) {
      console.error("Error saving cost prices:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save cost prices",
        variant: "destructive",
      });
    } finally {
      setCostPriceSaving(false);
    }
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Size Range Management */}
          <Dialog open={isSizeRangeDialogOpen} onOpenChange={setIsSizeRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Size Ranges</span>
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
                <span className="hidden sm:inline">Brands</span>
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
          <Button variant="outline" size="sm" className="gap-2 hidden sm:flex" onClick={handleImportClick}>
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hidden sm:flex" onClick={handleExportInventory}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <Label>Category</Label>
                    <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={categoryComboOpen} className="w-full justify-between font-normal">
                          {newProduct.category || "Select or type category..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Search category..." value={categorySearch} onValueChange={setCategorySearch} />
                          <CommandList>
                            <CommandEmpty>
                              {categorySearch.trim() ? (
                                <button
                                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent"
                                  onClick={() => {
                                    setNewProduct({ ...newProduct, category: categorySearch.trim() });
                                    setCategorySearch("");
                                    setCategoryComboOpen(false);
                                  }}
                                >
                                  Add "{categorySearch.trim()}"
                                </button>
                              ) : "No categories found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {existingCategories.map((cat) => (
                                <CommandItem key={cat} value={cat} onSelect={() => {
                                  setNewProduct({ ...newProduct, category: cat });
                                  setCategorySearch("");
                                  setCategoryComboOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", newProduct.category === cat ? "opacity-100" : "opacity-0")} />
                                  {cat}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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

                <div className="space-y-2">
                    <Label htmlFor="pairsPerBundle">Default Pairs per Bundle</Label>
                    <Input
                      id="pairsPerBundle"
                      type="number"
                      value={newProduct.defaultPairsPerBundle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProduct((prev) => ({
                          ...prev,
                          defaultPairsPerBundle: val,
                          sizeBundles: prev.sizeBundles.map((sb) => ({ ...sb, pairsPerBundle: val })),
                        }));
                      }}
                      placeholder="6"
                    />
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
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
                          <div className="w-full sm:w-20 space-y-2">
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
                          <div className="w-full sm:w-24 space-y-2">
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

      {/* Products - Mobile Card View */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:hidden space-y-3"
      >
        {filteredProducts.map((product, index) => {
          const totalPairs = product.sizeBundles.reduce(
            (sum: number, sb: any) => sum + (sb.quantity ?? 0) * (sb.pairsPerBundle ?? 6),
            0
          );
          const stockStatus = getStockStatus(product);
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * index }}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50"
            >
              {/* Header: Name, Article, Actions */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{product.articleNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn("status-badge text-[10px]", stockStatus.class)}>
                    {stockStatus.label}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => handleEditProduct(product)}>
                        <Edit2 className="w-4 h-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => handleOpenRestock(product)}>
                        <Plus className="w-4 h-4" /> Restock
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem className="gap-2" onClick={() => handleOpenCostPrice(product)}>
                          <DollarSign className="w-4 h-4" /> Cost Price
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteProductId(product.id)}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="status-badge status-badge-default text-[10px]">{product.brandName}</span>
                <span className="text-[10px] capitalize text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{product.gender}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{product.category}</span>
              </div>

              {/* Size Bundles - Grid */}
              {product.sizeBundles.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {product.sizeBundles.map((sb: any) => (
                    <div key={sb.sizeRange} className="bg-muted/50 rounded-lg px-2.5 py-2 border border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{sb.sizeRange}</span>
                        <span className="text-[10px] text-muted-foreground">Rs {sb.pricePerPair}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">{sb.quantity ?? 0}</span> bdl × {sb.pairsPerBundle}p = <span className="font-medium text-foreground">{(sb.quantity ?? 0) * sb.pairsPerBundle}</span> pairs
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Total Stock</span>
                <span className="text-sm font-bold text-foreground">{totalPairs} pairs</span>
              </div>
            </motion.div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or add new products.</p>
          </div>
        )}
      </motion.div>

      {/* Products - Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:block bg-card rounded-xl shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Article #</th>
                <th>Brand</th>
                <th>Type</th>
                <th>Size Bundles (Stock)</th>
                {isAdmin && <th>Cost / Profit</th>}
                <th>Total Pairs</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const totalPairs = product.sizeBundles.reduce(
                  (sum: number, sb: any) => sum + (sb.quantity ?? 0) * (sb.pairsPerBundle ?? 6),
                  0
                );
                const stockStatus = getStockStatus(product);
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
                          <span className="font-medium text-foreground block">{product.name}</span>
                          <span className="text-xs text-muted-foreground">{product.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground font-mono text-sm">{product.articleNumber}</td>
                    <td><span className="status-badge status-badge-default">{product.brandName}</span></td>
                    <td><span className="text-xs capitalize text-muted-foreground">{product.gender}</span></td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        {product.sizeBundles.map((sb: any) => (
                          <span key={sb.sizeRange} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{sb.sizeRange}:</span>{" "}
                            {sb.quantity ?? 0} bdl × {sb.pairsPerBundle}p = {(sb.quantity ?? 0) * sb.pairsPerBundle} pairs | Rs {sb.pricePerPair}/pair
                          </span>
                        ))}
                      </div>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex flex-col gap-1 text-xs">
                          {product.sizeBundles.map((sb: any) => {
                            const cost = sb.costPerPair;
                            const sell = sb.pricePerPair;
                            if (cost === null || cost === undefined) {
                              return (
                                <span key={sb.sizeRange} className="text-muted-foreground italic">
                                  {sb.sizeRange}: Not set
                                </span>
                              );
                            }
                            const profit = sell - cost;
                            const margin = sell > 0 ? ((profit / sell) * 100).toFixed(0) : "0";
                            return (
                              <span key={sb.sizeRange} className="text-muted-foreground">
                                <span className="font-medium text-foreground">{sb.sizeRange}:</span>{" "}
                                <span className={cn("font-semibold", profit > 0 ? "text-primary" : "text-destructive")}>Rs {profit}</span>{" "}
                                <span className="text-muted-foreground">({margin}%)</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{totalPairs}</span>
                        <span className={cn("status-badge", stockStatus.class)}>{stockStatus.label}</span>
                      </div>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => handleEditProduct(product)}>
                            <Edit2 className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleOpenRestock(product)}>
                            <Plus className="w-4 h-4" /> Restock
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem className="gap-2" onClick={() => handleOpenCostPrice(product)}>
                              <DollarSign className="w-4 h-4" /> Cost Price
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteProductId(product.id)}>
                            <Trash2 className="w-4 h-4" /> Delete
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
            <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or add new products.</p>
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductDialogOpen} onOpenChange={(open) => {
        setIsEditProductDialogOpen(open);
        if (!open) {
          setEditingProduct(null);
          setNewProduct({
            name: "",
            articleNumber: "",
            brandId: "",
            category: "",
            gender: "unisex",
            pairsPerDozen: "12",
            defaultPairsPerBundle: "6",
            
            sizeBundles: [],
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-article">Article Number *</Label>
                <Input
                  id="edit-article"
                  value={newProduct.articleNumber}
                  onChange={(e) => setNewProduct({ ...newProduct, articleNumber: e.target.value })}
                  placeholder="e.g. SKU-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Brand *</Label>
                <Select
                  value={newProduct.brandId}
                  onValueChange={(value) => setNewProduct({ ...newProduct, brandId: value })}
                >
                  <SelectTrigger id="edit-brand">
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
                <Label>Category</Label>
                <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={categoryComboOpen} className="w-full justify-between font-normal">
                      {newProduct.category || "Select or type category..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." value={categorySearch} onValueChange={setCategorySearch} />
                      <CommandList>
                        <CommandEmpty>
                          {categorySearch.trim() ? (
                            <button
                              className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent"
                              onClick={() => {
                                setNewProduct({ ...newProduct, category: categorySearch.trim() });
                                setCategorySearch("");
                                setCategoryComboOpen(false);
                              }}
                            >
                              Add "{categorySearch.trim()}"
                            </button>
                          ) : "No categories found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {existingCategories.map((cat) => (
                            <CommandItem key={cat} value={cat} onSelect={() => {
                              setNewProduct({ ...newProduct, category: cat });
                              setCategorySearch("");
                              setCategoryComboOpen(false);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", newProduct.category === cat ? "opacity-100" : "opacity-0")} />
                              {cat}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Type *</Label>
                <Select
                  value={newProduct.gender}
                  onValueChange={(v) => setNewProduct({ ...newProduct, gender: v as GenderCategory })}
                >
                  <SelectTrigger id="edit-gender">
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

            {/* Size Bundles */}
            <div className="space-y-3">
              <Label>Size Bundles, Pricing & Quantity</Label>
              {newProduct.sizeBundles.map((sb, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Size Range</Label>
                    <Input
                      value={sb.sizeRange}
                      onChange={(e) => updateSizeBundleRange(idx, e.target.value, true)}
                      placeholder="e.g. 7-10"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Rs/Pair</Label>
                    <Input
                      type="number"
                      value={sb.pricePerPair}
                      onChange={(e) => updateSizeBundlePrice(idx, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Pairs/Bdl</Label>
                    <Input
                      type="number"
                      value={sb.pairsPerBundle}
                      onChange={(e) => updateSizeBundlePairs(idx, e.target.value)}
                      placeholder="6"
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qty (Bdl)</Label>
                    <Input
                      type="number"
                      value={sb.quantity}
                      onChange={(e) => updateSizeBundleQuantity(idx, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSizeBundle(idx)}
                    className="text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSizeBundle}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Size Bundle
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditProduct}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={(open) => {
        setIsRestockDialogOpen(open);
        if (!open) setRestockProduct(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Restock: {restockProduct?.name}</DialogTitle>
            <DialogDescription>
              Enter the number of NEW bundles to add to existing stock for each size range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {restockBundles.map((bundle, idx) => (
              <div key={bundle.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{bundle.sizeRange}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {bundle.currentQty} bdl ({bundle.currentQty * bundle.pairsPerBundle} pairs)
                  </p>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Add Bundles</Label>
                  <Input
                    type="number"
                    value={bundle.addQty}
                    onChange={(e) => {
                      const updated = [...restockBundles];
                      updated[idx] = { ...updated[idx], addQty: e.target.value };
                      setRestockBundles(updated);
                    }}
                    placeholder="0"
                    min="0"
                    className="h-9"
                  />
                </div>
                <div className="w-20 text-right">
                  <p className="text-xs text-muted-foreground">New Total</p>
                  <p className="text-sm font-bold text-primary">
                    {bundle.currentQty + (parseInt(bundle.addQty) || 0)} bdl
                  </p>
                </div>
              </div>
            ))}
            {restockBundles.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No size bundles configured for this product. Edit the product first to add size bundles.
              </p>
            )}
            {/* Summary */}
            {restockBundles.some(b => parseInt(b.addQty) > 0) && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium">
                  Adding: <span className="text-primary">
                    {restockBundles.reduce((sum, b) => sum + (parseInt(b.addQty) || 0), 0)} bundles
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({restockBundles.reduce((sum, b) => sum + (parseInt(b.addQty) || 0) * b.pairsPerBundle, 0)} pairs)
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRestock} 
              disabled={restockSaving || !restockBundles.some(b => parseInt(b.addQty) > 0)}
            >
              {restockSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Add Stock"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Price Dialog (Admin Only) */}
      {isAdmin && (
        <Dialog open={isCostPriceDialogOpen} onOpenChange={(open) => {
          setIsCostPriceDialogOpen(open);
          if (!open) setCostPriceProduct(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Set Cost Price: {costPriceProduct?.name}</DialogTitle>
              <DialogDescription>
                Enter the purchase cost per pair for each size range. This is only visible to admins.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {costPriceInputs.map((input, idx) => {
                const cost = parseFloat(input.costPerPair) || 0;
                const profit = cost > 0 ? input.sellingPrice - cost : 0;
                return (
                  <div key={input.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{input.sizeRange}</p>
                      <p className="text-xs text-muted-foreground">
                        Selling: Rs {input.sellingPrice}/pair
                      </p>
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Cost/Pair (Rs)</Label>
                      <Input
                        type="number"
                        value={input.costPerPair}
                        onChange={(e) => {
                          const updated = [...costPriceInputs];
                          updated[idx] = { ...updated[idx], costPerPair: e.target.value };
                          setCostPriceInputs(updated);
                        }}
                        placeholder="0"
                        min="0"
                        className="h-9"
                      />
                    </div>
                    <div className="w-20 text-right">
                      <p className="text-xs text-muted-foreground">Profit</p>
                      {cost > 0 ? (
                        <p className={cn("text-sm font-bold", profit > 0 ? "text-primary" : "text-destructive")}>
                          Rs {profit}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {costPriceInputs.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No size bundles configured for this product.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCostPriceDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCostPrice}
                disabled={costPriceSaving}
              >
                {costPriceSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Cost Prices"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Inventory;
