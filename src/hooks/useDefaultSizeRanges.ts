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
