import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { AlertTriangle, Package, DollarSign, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";

export default function Dashboard() {
  const [selectedMarketplace, setSelectedMarketplace] = useState("All");
  const { user } = useAuth();
  const { platforms: availablePlatforms } = useFirestorePlatforms();

  // Fetch BI Data which contains inventory_master (centralized source of truth)
  const { data: biData, isLoading, error } = useQuery({
    queryKey: ["/api/bi/data"],
    queryFn: async () => {
      const res = await fetch("/api/bi/data", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json();
    },
    staleTime: 60000,
  });

  const inventoryStats = useMemo(() => {
    if (!biData?.inventoryMaster) return null;
    const inv = biData.inventoryMaster;

    let totalValuation = 0;
    let lowStockCount = 0;
    let amazonStock = 0;
    let flipkartStock = 0;
    let meeshoStock = 0;
    const lowStockItems: any[] = [];
    const topStockedItems: any[] = [];

    inv.forEach((item: any) => {
      const cost = parseFloat(item.cost_price) || 0;

      let stock = 0;
      if (selectedMarketplace === "All") {
        // Only sum up stocks for available platforms
        if (availablePlatforms.includes("Amazon")) stock += (item.amazon_stock || 0);
        if (availablePlatforms.includes("Flipkart")) stock += (item.flipkart_stock || 0);
        if (availablePlatforms.includes("Meesho")) stock += (item.meesho_stock || 0);
      } else if (selectedMarketplace === "Amazon") {
        stock = item.amazon_stock || 0;
      } else if (selectedMarketplace === "Flipkart") {
        stock = item.flipkart_stock || 0;
      } else if (selectedMarketplace === "Meesho") {
        stock = item.meesho_stock || 0;
      }

      totalValuation += (stock * cost);

      if (stock > 0 && stock < 10) {
        lowStockCount++;
        lowStockItems.push({ ...item, currentStock: stock });
      }

      amazonStock += (item.amazon_stock || 0);
      flipkartStock += (item.flipkart_stock || 0);
      meeshoStock += (item.meesho_stock || 0);

      topStockedItems.push({ ...item, currentStock: stock });
    });

    // Sort top stocked
    topStockedItems.sort((a, b) => b.currentStock - a.currentStock);

    return {
      totalValuation,
      lowStockCount,
      lowStockItems: lowStockItems.slice(0, 5),
      topStockedItems: topStockedItems.slice(0, 5),
      distribution: [
        { name: "Amazon", value: amazonStock, color: "#FF9900" },
        { name: "Flipkart", value: flipkartStock, color: "#2874F0" },
        { name: "Meesho", value: meeshoStock, color: "#D32F2F" },
      ].filter(d => d.value > 0 && (selectedMarketplace === "All" ? availablePlatforms.includes(d.name) : selectedMarketplace === d.name))
    };
  }, [biData, selectedMarketplace, availablePlatforms]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load inventory data.</AlertDescription>
      </Alert>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex justify-between items-start"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventory Health</h1>
          <p className="text-muted-foreground">Monitor stock levels and valuation.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={selectedMarketplace}
            onChange={(e) => setSelectedMarketplace(e.target.value)}
          >
            <option value="All">All Marketplaces</option>
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Valuation</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{inventoryStats?.totalValuation.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total cost value of stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats?.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">SKUs with &lt; 10 units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{biData?.inventoryMaster?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Unique SKUs tracked</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        {/* Stock Distribution Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Stock Distribution</CardTitle>
            <CardDescription>Inventory split by marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStats?.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryStats?.distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Stocked Items */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Stocked Items</CardTitle>
            <CardDescription>Highest quantity SKUs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventoryStats?.topStockedItems.length === 0 && <p className="text-sm text-muted-foreground">No inventory data.</p>}
              {inventoryStats?.topStockedItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.product_name || item.sku}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{item.currentStock}</p>
                    <p className="text-xs text-muted-foreground">units</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock List */}
      {inventoryStats?.lowStockItems && inventoryStats.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Low Stock Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryStats.lowStockItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm bg-orange-50 p-2 rounded border border-orange-100">
                  <span>{item.product_name || item.sku}</span>
                  <span className="font-bold text-orange-700">{item.currentStock} units left</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </motion.div>
  );
}
