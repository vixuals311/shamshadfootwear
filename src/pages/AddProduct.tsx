import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Package, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useDefaultSizeRanges, ProductCategory } from "@/hooks/useDefaultSizeRanges";
import { Brand } from "@/types";

interface SizeBundleInput {
  sizeRange: string;
  pricePerPair: string;
  pairsPerBundle: string;
  quantity: string;
  isCustom: boolean;
}

type GenderCategory = "men" | "women" | "children" | "unisex";

const GENDER_OPTIONS: { value: GenderCategory; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "children", label: "Children" },
  { value: "unisex", label: "Unisex" },
];

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { log } = useAuditLog();
  const { getSizeRangesForCategory } = useDefaultSizeRanges();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [customSizeRange, setCustomSizeRange] = useState("");

  const [product, setProduct] = useState({
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

  useEffect(() => {
    supabase
      .from("brands")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setBrands(data.map((b) => ({ id: b.id, name: b.name })));
      });
  }, []);

  const totalStockPairs = useMemo(() => {
    return product.sizeBundles.reduce((sum, sb) => {
      const qty = parseInt(sb.quantity) || 0;
      const pairs = parseInt(sb.pairsPerBundle) || 6;
      return sum + qty * pairs;
    }, 0);
  }, [product.sizeBundles]);

  const addDefaultSizeRangesForGender = (gender: GenderCategory) => {
    setProduct((prev) => ({ ...prev, gender }));
    const defaultRanges = getSizeRangesForCategory(gender as ProductCategory);
    if (defaultRanges.length > 0) {
      const newSizeBundles: SizeBundleInput[] = defaultRanges.map((sr) => ({
        sizeRange: sr.size_range,
        pricePerPair: "",
        pairsPerBundle: sr.pairs_per_bundle.toString(),
        quantity: "",
        isCustom: false,
      }));
      setProduct((prev) => ({ ...prev, gender, sizeBundles: newSizeBundles }));
    }
  };

  const updateSizeBundleField = (index: number, field: keyof SizeBundleInput, value: string) => {
    const updated = [...product.sizeBundles];
    updated[index] = { ...updated[index], [field]: value };
    setProduct({ ...product, sizeBundles: updated });
  };

  const removeSizeBundle = (index: number) => {
    setProduct({ ...product, sizeBundles: product.sizeBundles.filter((_, i) => i !== index) });
  };

  const addSizeBundle = () => {
    setProduct({
      ...product,
      sizeBundles: [
        ...product.sizeBundles,
        { sizeRange: "", pricePerPair: "", pairsPerBundle: product.defaultPairsPerBundle || "6", quantity: "", isCustom: false },
      ],
    });
  };

  const addCustomSizeBundle = () => {
    if (customSizeRange.trim()) {
      setProduct({
        ...product,
        sizeBundles: [
          ...product.sizeBundles,
          { sizeRange: customSizeRange.trim(), pricePerPair: "", pairsPerBundle: product.defaultPairsPerBundle || "6", quantity: "", isCustom: true },
        ],
      });
      setCustomSizeRange("");
    }
  };

  const handleAddProduct = async () => {
    if (!product.name || !product.articleNumber || !product.brandId) {
      toast({ title: "Missing Information", description: "Product name, article number, and brand are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const totalDozens = product.sizeBundles.reduce((sum, sb) => {
        const qty = parseInt(sb.quantity) || 0;
        const pairsPerBundle = parseInt(sb.pairsPerBundle) || 6;
        const pairsPerDozen = parseInt(product.pairsPerDozen) || 12;
        return sum + (qty * pairsPerBundle) / pairsPerDozen;
      }, 0);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          name: product.name,
          article_number: product.articleNumber,
          brand_id: product.brandId,
          category: product.category || "General",
          gender: product.gender,
          stock_dozens: totalDozens,
          pairs_per_dozen: parseInt(product.pairsPerDozen) || 12,
          supplier: product.supplier || null,
        })
        .select()
        .single();

      if (productError) throw productError;

      const sizeBundleInserts = product.sizeBundles
        .filter((sb) => sb.sizeRange && sb.pricePerPair)
        .map((sb) => ({
          product_id: productData.id,
          size_range: sb.sizeRange,
          price_per_pair: parseFloat(sb.pricePerPair) || 0,
          pairs_per_bundle: parseInt(sb.pairsPerBundle) || 6,
          quantity: parseInt(sb.quantity) || 0,
        }));

      if (sizeBundleInserts.length > 0) {
        const { error: bundleError } = await supabase.from("product_size_bundles").insert(sizeBundleInserts);
        if (bundleError) throw bundleError;
      }

      await log({
        action: "create",
        entityType: "product",
        entityId: productData.id,
        details: { name: product.name, article_number: product.articleNumber, gender: product.gender, size_bundles_count: sizeBundleInserts.length },
      });

      toast({ title: "Success", description: "Product added successfully" });
      setShowConfirm(false);
      navigate("/inventory");
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({ title: "Error", description: error.message || "Failed to add product", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7" />
            Add New Product
          </h1>
          <p className="text-muted-foreground mt-1">Fill in the product details and size bundle pricing</p>
        </div>
      </div>

      {/* Product Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Information</CardTitle>
          <CardDescription>Basic product details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Name + Article */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name <span className="text-destructive">*</span></Label>
              <Input
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Article Number / SKU <span className="text-destructive">*</span></Label>
              <Input
                value={product.articleNumber}
                onChange={(e) => setProduct({ ...product, articleNumber: e.target.value })}
                placeholder="e.g., CC-001"
              />
            </div>
          </div>

          {/* Row 2: Brand + Category + Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Brand <span className="text-destructive">*</span></Label>
              <Select value={product.brandId} onValueChange={(value) => setProduct({ ...product, brandId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                placeholder="e.g., Shoes, Sandals"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender / Type</Label>
              <Select value={product.gender} onValueChange={(value: GenderCategory) => addDefaultSizeRangesForGender(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Pairs per Bundle + Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Pairs per Bundle</Label>
              <Input
                type="number"
                value={product.defaultPairsPerBundle}
                onChange={(e) => setProduct({ ...product, defaultPairsPerBundle: e.target.value })}
                placeholder="6"
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                value={product.supplier}
                onChange={(e) => setProduct({ ...product, supplier: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Size Bundles Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Size Bundle Pricing & Quantity</CardTitle>
              <CardDescription>
                {product.gender !== "unisex"
                  ? `Default sizes loaded for ${product.gender}`
                  : "Add size bundles with pricing and stock quantity"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Size Bundles List */}
          {product.sizeBundles.map((sb, index) => (
            <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Size Range</Label>
                  <Input
                    value={sb.sizeRange}
                    onChange={(e) => updateSizeBundleField(index, "sizeRange", e.target.value)}
                    placeholder="e.g., 7-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Price/Pair (Rs)</Label>
                  <Input
                    type="number"
                    value={sb.pricePerPair}
                    onChange={(e) => updateSizeBundleField(index, "pricePerPair", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pairs/Bundle</Label>
                  <Input
                    type="number"
                    value={sb.pairsPerBundle}
                    onChange={(e) => updateSizeBundleField(index, "pairsPerBundle", e.target.value)}
                    placeholder="6"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Qty (Bundles)</Label>
                  <Input
                    type="number"
                    value={sb.quantity}
                    onChange={(e) => updateSizeBundleField(index, "quantity", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
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
              </div>
              {sb.quantity && parseInt(sb.quantity) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  = {parseInt(sb.quantity) * (parseInt(sb.pairsPerBundle) || 6)} pairs
                </p>
              )}
            </div>
          ))}

          {/* Total Stock */}
          {totalStockPairs > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-foreground">
                Total Stock: <span className="text-primary">{totalStockPairs} pairs</span>
                <span className="text-muted-foreground ml-2">
                  ({(totalStockPairs / (parseInt(product.pairsPerDozen) || 12)).toFixed(1)} dozens)
                </span>
              </p>
            </div>
          )}

          {/* Add Custom Size Range */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Add Custom Size Range</Label>
              <Input
                value={customSizeRange}
                onChange={(e) => setCustomSizeRange(e.target.value)}
                placeholder="e.g., 11-13"
              />
            </div>
            <Button type="button" variant="secondary" onClick={addCustomSizeBundle} disabled={!customSizeRange.trim()}>
              Add Custom
            </Button>
          </div>

          {/* Add Size Bundle */}
          <Button type="button" variant="outline" onClick={addSizeBundle} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Size Bundle
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/inventory")}>Cancel</Button>
        <Button onClick={() => setShowConfirm(true)} className="gap-2" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Add Product
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Add Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{product.name}" ({product.articleNumber}) with {product.sizeBundles.length} size bundle(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddProduct} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
