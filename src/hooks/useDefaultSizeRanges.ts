import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductCategory = "men" | "women" | "children" | "unisex";

export interface DefaultSizeRange {
  id: string;
  category: ProductCategory;
  size_range: string;
  pairs_per_bundle: number;
  created_at: string;
}

export function useDefaultSizeRanges() {
  const [sizeRanges, setSizeRanges] = useState<DefaultSizeRange[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSizeRanges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("default_size_ranges")
        .select("*")
        .order("category", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      setSizeRanges(data || []);
    } catch (error) {
      console.error("Error fetching size ranges:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSizeRanges();
  }, [fetchSizeRanges]);

  const getSizeRangesForCategory = (category: ProductCategory): DefaultSizeRange[] => {
    return sizeRanges.filter((sr) => sr.category === category);
  };

  // Returns a comparator function that sorts size_range strings by their display_order in settings
  const getSizeRangeSortIndex = (sizeRange: string): number => {
    const index = sizeRanges.findIndex((sr) => sr.size_range === sizeRange);
    return index === -1 ? 9999 : index; // Unknown ranges go to end
  };

  const sortBySizeRangeOrder = <T extends { sizeRange?: string; size_range?: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const aRange = a.sizeRange || a.size_range || "";
      const bRange = b.sizeRange || b.size_range || "";
      return getSizeRangeSortIndex(aRange) - getSizeRangeSortIndex(bRange);
    });
  };

  const addSizeRange = async (
    category: ProductCategory,
    sizeRange: string,
    pairsPerBundle: number = 6
  ) => {
    try {
      const { data, error } = await supabase
        .from("default_size_ranges")
        .insert({
          category,
          size_range: sizeRange,
          pairs_per_bundle: pairsPerBundle,
        })
        .select()
        .single();

      if (error) throw error;
      setSizeRanges((prev) => [...prev, data]);
      return data;
    } catch (error) {
      console.error("Error adding size range:", error);
      throw error;
    }
  };

  const deleteSizeRange = async (id: string) => {
    try {
      const { error } = await supabase
        .from("default_size_ranges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSizeRanges((prev) => prev.filter((sr) => sr.id !== id));
    } catch (error) {
      console.error("Error deleting size range:", error);
      throw error;
    }
  };

  return {
    sizeRanges,
    loading,
    getSizeRangesForCategory,
    addSizeRange,
    deleteSizeRange,
    refetch: fetchSizeRanges,
  };
}
