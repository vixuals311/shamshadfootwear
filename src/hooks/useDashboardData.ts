import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedData } from "@/lib/offlineDb";

interface DashboardStats {
  totalRevenue: number;
  revenueChange: string;
  activeInvoices: number;
  invoiceChange: string;
  productsInStock: number;
  stockChange: string;
  activeClients: number;
  clientChange: string;
  paidThisMonth: number;
  pendingPayments: number;
  overdueAmount: number;
}

interface RecentInvoice {
  id: string;
  client: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft" | "partial";
  date: string;
  invoiceNumber: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  threshold: number;
}

interface MonthlySalesData {
  name: string;
  sales: number;
  payments: number;
}

async function fetchTableWithFallback(tableName: string, selectColumns: string) {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select(selectColumns)
        .limit(5000);
      if (!error && data) return data as any[];
    } catch {
      // fall through to cache
    }
  }
  return getCachedData(tableName);
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel with offline fallback
      const [invoices, clients, products, recoveries] = await Promise.all([
        fetchTableWithFallback("invoices", "id, total, status, amount_received, created_at, invoice_number, client_id"),
        fetchTableWithFallback("clients", "id, name, created_at"),
        fetchTableWithFallback("products", "id, name, stock_dozens, pairs_per_dozen"),
        fetchTableWithFallback("recoveries", "amount, date"),
      ]);

      setFromCache(!navigator.onLine);

      // Build a client name map for recent invoices
      const clientMap = new Map((clients || []).map((c: any) => [c.id, c.name]));

      // Calculate stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const totalRevenue = (invoices || [])
        .filter((i: any) => i.status === "paid")
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const thisMonthRevenue = (invoices || [])
        .filter((i: any) => {
          const d = new Date(i.created_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && i.status === "paid";
        })
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const lastMonthRevenue = (invoices || [])
        .filter((i: any) => {
          const d = new Date(i.created_at);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && i.status === "paid";
        })
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const revenueChange = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : "0";

      const activeInvoices = (invoices || []).filter((i: any) => i.status === "pending" || i.status === "partial").length;
      const newInvoicesThisMonth = (invoices || []).filter((i: any) => {
        const d = new Date(i.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      const totalPairs = (products || []).reduce((sum: number, p: any) => sum + (p.stock_dozens * p.pairs_per_dozen), 0);

      const activeClientsCount = (clients || []).length;
      const newClientsThisMonth = (clients || []).filter((c: any) => {
        const d = new Date(c.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      const paidThisMonth = (invoices || [])
        .filter((i: any) => {
          const d = new Date(i.created_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && i.status === "paid";
        })
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const pendingPayments = (invoices || [])
        .filter((i: any) => i.status === "pending" || i.status === "partial")
        .reduce((sum: number, i: any) => sum + (i.total - i.amount_received), 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueAmount = (invoices || [])
        .filter((i: any) => {
          const d = new Date(i.created_at);
          return d < thirtyDaysAgo && (i.status === "pending" || i.status === "partial");
        })
        .reduce((sum: number, i: any) => sum + (i.total - i.amount_received), 0);

      const lowStock = (products || [])
        .filter((p: any) => p.stock_dozens < 10)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          stock: p.stock_dozens * p.pairs_per_dozen,
          threshold: 120,
        }))
        .slice(0, 5);

      // Monthly sales data (last 6 months)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const salesData: MonthlySalesData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = (thisMonth - i + 12) % 12;
        const year = thisMonth - i < 0 ? thisYear - 1 : thisYear;
        
        const monthSales = (invoices || [])
          .filter((inv: any) => {
            const d = new Date(inv.created_at);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((sum: number, inv: any) => sum + inv.total, 0);

        const monthPayments = (recoveries || [])
          .filter((r: any) => {
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((sum: number, r: any) => sum + r.amount, 0);

        salesData.push({
          name: monthNames[month],
          sales: monthSales,
          payments: monthPayments,
        });
      }

      // Recent invoices (sorted by created_at, top 5)
      const sortedInvoices = [...(invoices || [])]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const formattedRecentInvoices: RecentInvoice[] = sortedInvoices.map((inv: any) => {
        const createdDate = new Date(inv.created_at);
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        let dateStr = "Today";
        if (diffDays === 1) dateStr = "Yesterday";
        else if (diffDays > 1 && diffDays < 7) dateStr = `${diffDays} days ago`;
        else if (diffDays >= 7) dateStr = `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;

        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          client: clientMap.get(inv.client_id) || "Unknown",
          amount: inv.total,
          status: inv.status as RecentInvoice["status"],
          date: dateStr,
        };
      });

      setStats({
        totalRevenue,
        revenueChange: `${parseFloat(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
        activeInvoices,
        invoiceChange: `+${newInvoicesThisMonth} new`,
        productsInStock: totalPairs,
        stockChange: "",
        activeClients: activeClientsCount,
        clientChange: `+${newClientsThisMonth} new`,
        paidThisMonth,
        pendingPayments,
        overdueAmount,
      });

      setRecentInvoices(formattedRecentInvoices);
      setLowStockProducts(lowStock);
      setMonthlySales(salesData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, recentInvoices, lowStockProducts, monthlySales, loading, fromCache, refetch: fetchDashboardData };
}
