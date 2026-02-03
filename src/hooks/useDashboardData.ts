import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch invoices for stats
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, total, status, amount_received, created_at");

      if (invoicesError) throw invoicesError;

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, created_at");

      if (clientsError) throw clientsError;

      // Fetch products with stock
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, stock_dozens, pairs_per_dozen");

      if (productsError) throw productsError;

      // Fetch recent invoices with client info
      const { data: recentInvData, error: recentError } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, status, created_at, clients (name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Fetch recoveries for payments data
      const { data: recoveries, error: recoveriesError } = await supabase
        .from("recoveries")
        .select("amount, date");

      if (recoveriesError) throw recoveriesError;

      // Calculate stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      // Total revenue (all paid invoices)
      const totalRevenue = (invoices || [])
        .filter(i => i.status === "paid")
        .reduce((sum, i) => sum + i.total, 0);

      // Revenue this month vs last month
      const thisMonthRevenue = (invoices || [])
        .filter(i => {
          const d = new Date(i.created_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && i.status === "paid";
        })
        .reduce((sum, i) => sum + i.total, 0);

      const lastMonthRevenue = (invoices || [])
        .filter(i => {
          const d = new Date(i.created_at);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && i.status === "paid";
        })
        .reduce((sum, i) => sum + i.total, 0);

      const revenueChange = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : "0";

      // Active invoices (pending + partial)
      const activeInvoices = (invoices || []).filter(i => i.status === "pending" || i.status === "partial").length;
      const newInvoicesThisMonth = (invoices || []).filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      // Products in stock
      const totalPairs = (products || []).reduce((sum, p) => sum + (p.stock_dozens * p.pairs_per_dozen), 0);

      // Active clients
      const activeClientsCount = (clients || []).length;
      const newClientsThisMonth = (clients || []).filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      // Paid this month
      const paidThisMonth = (invoices || [])
        .filter(i => {
          const d = new Date(i.created_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && i.status === "paid";
        })
        .reduce((sum, i) => sum + i.total, 0);

      // Pending payments
      const pendingPayments = (invoices || [])
        .filter(i => i.status === "pending" || i.status === "partial")
        .reduce((sum, i) => sum + (i.total - i.amount_received), 0);

      // Overdue (older than 30 days and still pending)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueAmount = (invoices || [])
        .filter(i => {
          const d = new Date(i.created_at);
          return d < thirtyDaysAgo && (i.status === "pending" || i.status === "partial");
        })
        .reduce((sum, i) => sum + (i.total - i.amount_received), 0);

      // Low stock products (less than 10 dozens)
      const lowStock = (products || [])
        .filter(p => p.stock_dozens < 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock_dozens * p.pairs_per_dozen,
          threshold: 120, // 10 dozens * 12 pairs
        }))
        .slice(0, 5);

      // Monthly sales data (last 6 months)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const salesData: MonthlySalesData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = (thisMonth - i + 12) % 12;
        const year = thisMonth - i < 0 ? thisYear - 1 : thisYear;
        
        const monthSales = (invoices || [])
          .filter(inv => {
            const d = new Date(inv.created_at);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((sum, inv) => sum + inv.total, 0);

        const monthPayments = (recoveries || [])
          .filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        salesData.push({
          name: monthNames[month],
          sales: monthSales,
          payments: monthPayments,
        });
      }

      // Format recent invoices
      const formattedRecentInvoices: RecentInvoice[] = (recentInvData || []).map((inv: any) => {
        const createdDate = new Date(inv.created_at);
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        let dateStr = "Today";
        if (diffDays === 1) dateStr = "Yesterday";
        else if (diffDays > 1 && diffDays < 7) dateStr = `${diffDays} days ago`;
        else if (diffDays >= 7) dateStr = `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;

        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          client: inv.clients?.name || "Unknown",
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
        stockChange: "", // Would need historical data
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

  return { stats, recentInvoices, lowStockProducts, monthlySales, loading, refetch: fetchDashboardData };
}
