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
import { Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const salesData = [
  { month: "Jan", sales: 12400 },
  { month: "Feb", sales: 9800 },
  { month: "Mar", sales: 15600 },
  { month: "Apr", sales: 11200 },
  { month: "May", sales: 18900 },
  { month: "Jun", sales: 21500 },
];

const categoryData = [
  { name: "Electronics", value: 45 },
  { name: "Accessories", value: 25 },
  { name: "Furniture", value: 20 },
  { name: "Other", value: 10 },
];

const COLORS = ["hsl(234 89% 59%)", "hsl(160 84% 39%)", "hsl(38 92% 50%)", "hsl(220 9% 46%)"];

const Reports = () => {
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
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">$89,400</p>
          <p className="text-xs text-success mt-1">+18% from last period</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Invoices Sent</p>
          <p className="text-2xl font-bold text-foreground">156</p>
          <p className="text-xs text-success mt-1">+12 from last period</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Products Sold</p>
          <p className="text-2xl font-bold text-foreground">2,847</p>
          <p className="text-xs text-success mt-1">+320 from last period</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">New Clients</p>
          <p className="text-2xl font-bold text-foreground">24</p>
          <p className="text-xs text-success mt-1">+6 from last period</p>
        </div>
      </motion.div>

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
              <BarChart data={salesData}>
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
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(220 13% 91%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Sales"]}
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
                    style={{ backgroundColor: COLORS[index] }}
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
            <tr>
              <td className="font-medium">Mechanical Keyboard</td>
              <td>245</td>
              <td className="font-semibold">$36,747</td>
              <td className="text-success">+24%</td>
            </tr>
            <tr>
              <td className="font-medium">Monitor 27"</td>
              <td>189</td>
              <td className="font-semibold">$75,598</td>
              <td className="text-success">+18%</td>
            </tr>
            <tr>
              <td className="font-medium">Headphones Pro</td>
              <td>312</td>
              <td className="font-semibold">$62,397</td>
              <td className="text-success">+15%</td>
            </tr>
            <tr>
              <td className="font-medium">Wireless Mouse</td>
              <td>428</td>
              <td className="font-semibold">$12,826</td>
              <td className="text-destructive">-3%</td>
            </tr>
            <tr>
              <td className="font-medium">Webcam HD</td>
              <td>156</td>
              <td className="font-semibold">$14,038</td>
              <td className="text-success">+8%</td>
            </tr>
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default Reports;
