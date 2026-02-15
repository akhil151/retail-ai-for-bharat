import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldAlert, TrendingUp, Activity, Boxes, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";

interface InventoryItem {
  sku: string;
  product_name?: string;
  current_stock: number;
  avg_daily_sales: number;
  predicted_30d_demand: number;
  optimized_stock_level: number;
  decision: string;
  turnover_ratio: number;
  capital_locked_percent: number;
  profit_margin: number;
  risk_score: number;
  stock_value?: number;
  revenue_contribution?: number;
  demand_volatility?: number;
  sales_growth_rate?: number;
  stock_utilization_rate?: number;
  platform_distribution?: Record<string, number>;
}

interface InventoryResponse {
  items: InventoryItem[];
  metrics?: {
    accuracy?: number | null;
    confusion_matrix?: number[][] | null;
    labels?: string[];
    total_stock_value?: number;
  };
  generated_at?: string;
}

const decisionColors: Record<string, string> = {
  INCREASE: "bg-emerald-100 text-emerald-700",
  MAINTAIN: "bg-blue-100 text-blue-700",
  REDUCE: "bg-amber-100 text-amber-700",
};

export default function StockRecommendation() {
  const [activeTab, setActiveTab] = useState("inventory");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<InventoryResponse>({
    queryKey: ["/api/inventory-optimization"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-optimization", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inventory optimization data");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: health } = useQuery({
    queryKey: ["/api/inventory-optimization/health"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-optimization/health", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load health");
      return res.json();
    },
    staleTime: 60_000,
  });

  const items = data?.items ?? [];

  const stats = useMemo(() => {
    const totalStockValue = items.reduce((sum, item) => sum + (item.stock_value || 0), 0);
    const fastMoving = items.filter((i) => i.turnover_ratio > 1.1).length;
    const slowMoving = items.filter((i) => i.turnover_ratio < 0.6 || i.decision === "REDUCE").length;
    const highRisk = items.filter((i) => i.risk_score > 0.65).length;
    return { totalStockValue, fastMoving, slowMoving, highRisk };
  }, [items]);

  const stockVsDemand = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => (b.stock_value || 0) - (a.stock_value || 0))
      .slice(0, 15)
      .map((item) => ({
        sku: item.sku,
        stock: item.current_stock,
        demand: Math.round(item.predicted_30d_demand || 0),
      }));
  }, [items]);

  const turnoverRanking = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => b.turnover_ratio - a.turnover_ratio)
      .slice(0, 15)
      .map((item) => ({ sku: item.sku, turnover: Number(item.turnover_ratio?.toFixed(2)) }));
  }, [items]);

  const profitVsStock = useMemo(() => {
    return items.map((item) => ({
      sku: item.sku,
      margin: item.profit_margin,
      stock: item.current_stock,
      decision: item.decision,
    }));
  }, [items]);

  const decisionDistribution = useMemo(() => {
    const groups: Record<string, number> = {};
    items.forEach((item) => {
      groups[item.decision] = (groups[item.decision] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [items]);

  const decisionColorPalette = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading stock recommendations...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Unable to load Inventory Optimization</AlertTitle>
          <AlertDescription>
            Please verify the backend service is running and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Stock Recommendation</p>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Optimization</h1>
          <p className="text-muted-foreground mt-1">AI-assisted stock decisions across marketplaces</p>
        </div>
        <div className="flex items-center gap-3">
          {health && (health.data_status !== "ok" || !health.model_loaded) && (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              {health.model_loaded ? "Fallback mode" : "Model unavailable"}
            </Badge>
          )}
          {health?.drift_level === "warning" && (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              Drift Warning
            </Badge>
          )}
          {health?.model_stale && (
            <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
              Model Stale – Retraining Recommended
            </Badge>
          )}
          {health?.rollback_active && (
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
              Rollback Active
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="inventory">Inventory Optimization</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border">
              <CardHeader className="pb-2">
                <p className="text-xs uppercase text-muted-foreground">Total Stock Value</p>
                <CardTitle className="text-2xl">₹{Math.round(stats.totalStockValue).toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" /> Value locked across SKUs
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader className="pb-2">
                <p className="text-xs uppercase text-muted-foreground">Fast Moving SKUs</p>
                <CardTitle className="text-2xl">{stats.fastMoving}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Turnover &gt; 1.1x
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader className="pb-2">
                <p className="text-xs uppercase text-muted-foreground">Slow Moving SKUs</p>
                <CardTitle className="text-2xl">{stats.slowMoving}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" /> Turnover &lt; 0.6x
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader className="pb-2">
                <p className="text-xs uppercase text-muted-foreground">High Risk SKUs</p>
                <CardTitle className="text-2xl">{stats.highRisk}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Risk score &gt; 0.65
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Stock vs Predicted Demand (30d)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockVsDemand} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="sku" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} textAnchor="end" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="stock" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Current Stock" />
                    <Bar dataKey="demand" fill="#22c55e" radius={[4, 4, 0, 0]} name="Predicted Demand" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Turnover Ranking</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnoverRanking} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="sku" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} textAnchor="end" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="turnover" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="bg-card border xl:col-span-2">
              <CardHeader>
                <CardTitle>Profit vs Stock</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stock" name="Stock" />
                    <YAxis dataKey="margin" name="Margin" />
                    <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={profitVsStock} name="SKUs" fill="#8b5cf6">
                      {profitVsStock.map((entry, index) => (
                        <Cell key={entry.sku} fill={decisionColorPalette[index % decisionColorPalette.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Decision Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={decisionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {decisionDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={decisionColorPalette[index % decisionColorPalette.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border">
            <CardHeader>
              <CardTitle>SKU Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="max-h-[360px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Predicted Demand</TableHead>
                      <TableHead>Suggested Action</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <div className="font-medium">{item.sku}</div>
                          <p className="text-xs text-muted-foreground">{item.product_name || ""}</p>
                        </TableCell>
                        <TableCell>{item.current_stock}</TableCell>
                        <TableCell>{Math.round(item.predicted_30d_demand)}</TableCell>
                        <TableCell>
                          <Badge className={`${decisionColors[item.decision] || ""}`}>
                            {item.decision}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{Math.round(item.profit_margin)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 bg-muted rounded-full">
                              <div
                                className="h-2 bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(item.risk_score * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{(item.risk_score * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Reorder Alerts coming soon</AlertTitle>
            <AlertDescription>
              The backend logic will arrive next. For now, configure thresholds and review planned rules.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Rules preview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" /> Trigger when days of inventory &lt; 20</div>
                <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-emerald-500" /> Auto-draft PO for INCREASE SKUs</div>
                <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-slate-500" /> Email + dashboard notification</div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Vendors</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Assign preferred vendors per SKU and lead times.</p>
                <p className="text-xs">Future: auto compute EOQ and reorder dates.</p>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Slack / Email channels will be configurable.</p>
                <p className="text-xs">Alert policies will respect platform SLAs.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

