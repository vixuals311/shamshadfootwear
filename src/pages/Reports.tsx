import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportsData } from "@/hooks/useReportsData";
import { exportToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

const COLORS = ["hsl(234 89% 59%)", "hsl(160 84% 39%)", "hsl(38 92% 50%)", "hsl(220 9% 46%)"];

const Reports = () => {
  const { stats, monthlySales, categoryData, topProducts, loading } = useReportsData();
  const { toast } = useToast();
  const { log } = useAuditLog();

  const handleExport = () => {
    if (topProducts.length > 0) {
      exportToCSV(
        topProducts,
        [
          { key: "name", header: "Product" },
          { key: "unitsSold", header: "Units Sold" },
          { key: "revenue", header: "Revenue", format: (val: number) => `Rs ${val.toLocaleString()}` },
          { key: "growth", header: "Growth" },
        ],
        "reports"
      );
      
      log({
        action: "export",
        entityType: "report",
        details: { type: "top_products", count: topProducts.length },
      });
      
      toast({ title: "Success", description: "Report exported successfully" });
    }
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
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-muted-foreground">
            Analyze your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 6 months
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-card rounded-xl p-3 sm:p-5 shadow-card">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground">Rs {stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-success mt-1">{stats.revenueChange}</p>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-5 shadow-card">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Invoices Sent</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.invoicesSent}</p>
            <p className="text-xs text-success mt-1">{stats.invoicesChange}</p>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-5 shadow-card">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Products Sold</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.productsSold.toLocaleString()}</p>
            <p className="text-xs text-success mt-1">{stats.productsChange}</p>
          </div>
          <div className="bg-card rounded-xl p-3 sm:p-5 shadow-card">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">New Clients</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.newClients}</p>
            <p className="text-xs text-success mt-1">{stats.clientsChange}</p>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Monthly Sales
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(220 9% 46%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(220 9% 46%)", fontSize: 12 }}
                  tickFormatter={(value) => `Rs ${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`Rs ${value.toLocaleString()}`, "Sales"]}
                />
                <Bar
                  dataKey="sales"
                  fill="hsl(234 89% 59%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Sales by Category
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-xl p-6 shadow-card"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Top Selling Products
        </h3>
        {topProducts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Growth</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.name}>
                  <td className="font-medium">{product.name}</td>
                  <td>{product.unitsSold.toLocaleString()}</td>
                  <td className="font-semibold">Rs {product.revenue.toLocaleString()}</td>
                  <td className="text-success">{product.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No sales data available
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Reports;
