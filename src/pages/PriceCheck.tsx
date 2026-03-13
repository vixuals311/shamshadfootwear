import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PriceProduct {
  id: string;
  name: string;
  articleNumber: string;
  brandName: string;
  category: string;
  gender: string;
  sizeBundles: { sizeRange: string; pricePerPair: number; pairsPerBundle: number; quantity: number }[];
}

const PriceCheck = () => {
  const [products, setProducts] = useState<PriceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`*, brands (name), product_size_bundles (*)`)
          .order("article_number");

        if (error) throw error;

        setProducts(
          (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            articleNumber: p.article_number,
            brandName: p.brands?.name || "Unknown",
            category: p.category,
            gender: p.gender,
            sizeBundles: (p.product_size_bundles || []).map((sb: any) => ({
              sizeRange: sb.size_range,
              pricePerPair: sb.price_per_pair,
              pairsPerBundle: sb.pairs_per_bundle,
              quantity: sb.quantity ?? 0,
            })),
          }))
        );
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.articleNumber.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q);
      const matchesGender = genderFilter === "all" || p.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [products, searchQuery, genderFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-foreground">Price Check</h2>
        <p className="text-muted-foreground">Quick product price lookup</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, article no, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="men">Men</SelectItem>
            <SelectItem value="women">Women</SelectItem>
            <SelectItem value="children">Children</SelectItem>
            <SelectItem value="unisex">Unisex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.brandName} • Art# {product.articleNumber} • {product.gender}
                  </p>
                </div>
              </div>
              {product.sizeBundles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {product.sizeBundles.map((sb, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border text-center",
                        sb.quantity > 0
                          ? "border-success/30 bg-success/5"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">{sb.sizeRange}</p>
                      <p className="text-lg font-bold text-foreground">Rs {sb.pricePerPair}</p>
                      <p className="text-xs text-muted-foreground">
                        {sb.quantity > 0 ? `${sb.quantity} bundles` : "Out of stock"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No size/price data</p>
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceCheck;
