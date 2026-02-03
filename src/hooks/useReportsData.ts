import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReportStats {
  totalRevenue: number;
  revenueChange: string;
  invoicesSent: number;
  invoicesChange: string;
  productsSold: number;
  productsChange: string;
  newClients: number;
  clientsChange: string;
}

interface MonthlySalesData {
  month: string;
  sales: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface TopProduct {
  name: string;
  unitsSold: number;
  revenue: number;
  growth: string;
}

export function useReportsData() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, total, status, created_at")
        .gte("created_at", sixMonthsAgo.toISOString());

      if (invoicesError) throw invoicesError;

      // Fetch invoice items for product sales
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          id, product_name, total_pairs, total, created_at,
          invoices!inner (created_at, status)
        `)
        .gte("created_at", sixMonthsAgo.toISOString());

      if (itemsError) throw itemsError;

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, created_at")
        .gte("created_at", sixMonthsAgo.toISOString());

      if (clientsError) throw clientsError;

      // Fetch products for categories
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, category");

      if (productsError) throw productsError;

      // Calculate stats
      const totalRevenue = (invoices || [])
        .filter(i => i.status !== "draft")
        .reduce((sum, i) => sum + i.total, 0);

      const invoicesSent = (invoices || []).filter(i => i.status !== "draft").length;
      const productsSold = (invoiceItems || []).reduce((sum, item) => sum + item.total_pairs, 0);
      const newClients = (clients || []).length;

      // Previous period (6 months before that) - simplified comparison
      const prevInvoices = (invoices || []).filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth() < thisMonth - 3;
      });
      const prevRevenue = prevInvoices.reduce((sum, i) => sum + i.total, 0);
      const revenueChange = prevRevenue > 0 
        ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(0) 
        : "0";

      // Monthly sales data
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const salesData: MonthlySalesData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = (thisMonth - i + 12) % 12;
        const year = thisMonth - i < 0 ? thisYear - 1 : thisYear;
        
        const monthSales = (invoices || [])
          .filter(inv => {
            const d = new Date(inv.created_at);
            return d.getMonth() === month && d.getFullYear() === year && inv.status !== "draft";
          })
          .reduce((sum, inv) => sum + inv.total, 0);

        salesData.push({
          month: monthNames[month],
          sales: monthSales,
        });
      }

      // Category breakdown
      const categoryTotals: Record<string, number> = {};
      (invoiceItems || []).forEach((item: any) => {
        const product = (products || []).find(p => p.name === item.product_name);
        const category = product?.category || "Other";
        categoryTotals[category] = (categoryTotals[category] || 0) + item.total;
      });

      const totalCategorySales = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      const categories: CategoryData[] = Object.entries(categoryTotals)
        .map(([name, value]) => ({
          name,
          value: totalCategorySales > 0 ? Math.round((value / totalCategorySales) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      // Ensure we have at least some categories
      if (categories.length === 0) {
        categories.push({ name: "No sales data", value: 100 });
      }

      // Top products
      const productSales: Record<string, { pairs: number; revenue: number }> = {};
      (invoiceItems || []).forEach((item: any) => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { pairs: 0, revenue: 0 };
        }
        productSales[item.product_name].pairs += item.total_pairs;
        productSales[item.product_name].revenue += item.total;
      });

      const topProductsList: TopProduct[] = Object.entries(productSales)
        .map(([name, data]) => ({
          name,
          unitsSold: data.pairs,
          revenue: data.revenue,
          growth: "+0%", // Would need historical comparison
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalRevenue,
        revenueChange: `+${revenueChange}% from last period`,
        invoicesSent,
        invoicesChange: "+0 from last period",
        productsSold,
        productsChange: "+0 from last period",
        newClients,
        clientsChange: "+0 from last period",
      });

      setMonthlySales(salesData);
      setCategoryData(categories);
      setTopProducts(topProductsList);

    } catch (error) {
      console.error("Error fetching reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, monthlySales, categoryData, topProducts, loading, refetch: fetchReportsData };
}
