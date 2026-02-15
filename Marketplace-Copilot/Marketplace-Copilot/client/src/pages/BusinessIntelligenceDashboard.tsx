import { useMemo, memo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ComposedChart
} from "recharts";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";
import { Loader2, DollarSign, Activity, Package, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

// Data returned from /api/bi/data are arrays from the database

const generateDemandForecast = (salesData: any[]) => {
  const grouped = salesData.reduce((acc: any, row) => {
    const date = row.date;
    if (!acc[date]) acc[date] = { units: 0 };
    acc[date].units += parseInt(row.units_sold || 0);
    return acc;
  }, {});

  if (Object.keys(grouped).length === 0) return [];

  const historicalData = Object.entries(grouped)
    .map(([date, vals]: [string, any]) => ({
      date,
      label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      actual: vals.units,
      type: 'historical'
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Simple Linear Regression on the last 30 points (or fewer)
  const analysisWindow = historicalData.slice(-30);
  const n = analysisWindow.length;
  let slope = 0;
  let intercept = 0;

  if (n > 1) {
    const x = analysisWindow.map((_, i) => i);
    const y = analysisWindow.map(d => d.actual);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    const denominator = (n * sumXX - sumX * sumX);
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
    } else {
      intercept = sumY / n; // fallback to average if x variance is 0 (shouldn't happen with i=0..n)
    }
  } else if (n === 1) {
    intercept = analysisWindow[0].actual;
  }

  if (historicalData.length === 0) return [];

  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecast = [];

  for (let i = 1; i <= 14; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(lastDate.getDate() + i);

    // Project next value based on regression line
    // x coordinate for next point is n + (i - 1) relative to the analysis window start
    const nextX = n + (i - 1);
    let predicted = slope * nextX + intercept;

    // Add some small random noise for "realism" but keep it grounded
    // and ensure we don't predict negative demand
    const noise = (Math.random() - 0.5) * (intercept * 0.1);
    predicted = Math.max(0, Math.round(predicted + noise));

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      label: forecastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      predicted,
      type: 'forecast'
    });
  }

  return [...historicalData.slice(-30), ...forecast];
};

const pickNum = (obj: any, keys: string[], def = 0) => {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return parseFloat(v);
  }
  return def;
};

const normalizeSalesRowFromDb = (sale: any, product: any, platform: string) => {
  const units = Number(sale.quantity || 0);
  const revenue = Number(sale.amount || 0);
  return {
    date: sale.date,
    sku: product?.sku,
    platform,
    units,
    price: units ? revenue / units : 0,
    revenue
  };
};

const mapInventoryCost = (rows: any[]) => {
  const map: Record<string, number> = {};
  rows.forEach(r => {
    const sku = r.sku;
    const cost = pickNum(r, ["cost_price", "landed_cost", "procurement_cost"], 0);
    if (sku) map[sku] = cost;
  });
  return map;
};

const mapPlatformFee = (rows: any[]) => {
  const map: Record<string, { percent?: number; fixed?: number }> = {};
  rows.forEach(r => {
    const plat = r.platform || r.marketplace;
    const percent = pickNum(r, ["percent", "fee_percent", "commission_percent", "rate_percent"], NaN);
    const fixed = pickNum(r, ["fixed", "fixed_fee", "platform_fee_fixed"], NaN);
    if (plat) {
      map[plat] = {};
      if (!Number.isNaN(percent)) map[plat].percent = percent / 100;
      if (!Number.isNaN(fixed)) map[plat].fixed = fixed;
    }
  });
  return map;
};

const generateRevenueUnitsProfit = (salesRows: any[], costMap: Record<string, number>, feeMap: Record<string, { percent?: number; fixed?: number }>) => {
  const grouped: Record<string, { revenue: number; units: number; profit: number }> = {};
  salesRows.forEach(r => {
    if (!r.date) return;
    if (!grouped[r.date]) grouped[r.date] = { revenue: 0, units: 0, profit: 0 };
    const cost = (costMap[r.sku] || 0) * r.units;
    const feeCfg = feeMap[r.platform] || {};
    const percentFee = (feeCfg.percent || 0) * r.revenue;
    const fixedFee = feeCfg.fixed || 0;
    const fees = percentFee + fixedFee;
    grouped[r.date].revenue += Math.max(0, r.revenue);
    grouped[r.date].units += Math.max(0, r.units);
    grouped[r.date].profit += Math.max(0, r.revenue - cost - fees);
  });
  return Object.entries(grouped).map(([date, vals]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.max(0, Math.round(vals.revenue)),
    units: Math.max(0, Math.round(vals.units)),
    profit: Math.max(0, Math.round(vals.profit)),
    margin: vals.revenue > 0 ? Math.max(0, Math.round((vals.profit / vals.revenue) * 1000) / 10) : 0,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold mt-2 text-foreground">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-green-100 text-green-600' : trend === 'down' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {subtext && (
      <div className="flex items-center text-sm">
        {trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500 mr-1" /> :
          trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500 mr-1" /> : null}
        <span className="text-muted-foreground">{subtext}</span>
      </div>
    )}
  </div>
);

const BusinessIntelligenceDashboard = memo(function BusinessIntelligenceDashboard() {
  const { user } = useAuth();
  const { data: biData } = useQuery({
    queryKey: ["/api/bi/data"],
    queryFn: async () => {
      const res = await fetch("/api/bi/data", { credentials: "include" });
      return res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { platforms: availablePlatforms, loading: loadingFirestore } = useFirestorePlatforms();
  const [selectedPlatform, setSelectedPlatform] = useState("All");

  /* Removed manual Firestore subscription in favor of useFirestorePlatforms hook */

  const dailyData = useMemo(() => {
    if (!biData?.sales || !biData?.products || !biData?.platforms) return [];

    // Filter logic: Only show available platforms (from Firestore)
    const selected: string[] = selectedPlatform === "All" ? availablePlatforms : [selectedPlatform];
    const allSales: any[] = [];
    selected.forEach(plat => {
      const salesRows: any[] = biData.sales[plat] || [];
      const productsRows: any[] = biData.products[plat] || [];
      const idToProduct = new Map<number, any>();
      productsRows.forEach((p: any) => idToProduct.set(p.id, p));
      salesRows.forEach((s: any) => {
        const prod = idToProduct.get(s.productId);
        allSales.push(normalizeSalesRowFromDb(s, prod, plat));
      });
    });
    const invMap = mapInventoryCost(biData.inventoryMaster || []);
    const feeMap = mapPlatformFee(biData.platformFees || []);
    return generateRevenueUnitsProfit(allSales, invMap, feeMap);
  }, [biData, availablePlatforms, selectedPlatform]);

  const platformTotals = useMemo(() => {
    if (!biData?.sales || !biData?.products || !biData?.platforms) return [];
    // For totals, if "All" is selected, we show breakdown of all connected platforms.
    const selected: string[] = selectedPlatform === "All" ? availablePlatforms : [selectedPlatform];
    const totals: Record<string, { revenue: number; units: number; profit: number }> = {};
    const invMap = mapInventoryCost(biData.inventoryMaster || []);
    const feeMap = mapPlatformFee(biData.platformFees || []);
    selected.forEach(plat => {
      const salesRows: any[] = biData.sales[plat] || [];
      const productsRows: any[] = biData.products[plat] || [];
      const idToProduct = new Map<number, any>();
      productsRows.forEach((p: any) => idToProduct.set(p.id, p));
      salesRows.forEach((s: any) => {
        const r = normalizeSalesRowFromDb(s, idToProduct.get(s.productId), plat);
        if (!totals[plat]) totals[plat] = { revenue: 0, units: 0, profit: 0 };
        const cost = (invMap[r.sku] || 0) * r.units;
        const feeCfg = feeMap[plat] || {};
        const percentFee = (feeCfg.percent || 0) * r.revenue;
        const fixedFee = (feeCfg.fixed || 0);
        const fees = percentFee + fixedFee;
        totals[plat].revenue += r.revenue;
        totals[plat].units += r.units;
        totals[plat].profit += (r.revenue - cost - fees);
      });
    });
    return Object.entries(totals).map(([platform, vals]) => ({
      platform,
      revenue: Math.round(vals.revenue),
      profit: Math.round(vals.profit),
      units: Math.round(vals.units),
    }));
  }, [biData, availablePlatforms, selectedPlatform]);

  const forecastData = useMemo(() => {
    if (!biData?.sales || !biData?.products || !biData?.platforms) return [];
    const selected: string[] = selectedPlatform === "All" ? availablePlatforms : [selectedPlatform];
    const allSales: any[] = [];
    selected.forEach(plat => {
      const salesRows: any[] = biData.sales[plat] || [];
      // we only need simple unit counts for demand forecast across all platforms
      salesRows.forEach((s: any) => {
        allSales.push({
          date: s.date,
          units_sold: s.quantity
        });
      });
    });
    return generateDemandForecast(allSales);
  }, [biData, availablePlatforms, selectedPlatform]);

  const totalRevenue = dailyData.reduce((s, d: any) => s + (d.revenue || 0), 0);
  const totalProfit = dailyData.reduce((s, d: any) => s + (d.profit || 0), 0);
  const totalUnits = dailyData.reduce((s, d: any) => s + (d.units || 0), 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  const totalInventory = useMemo(() => {
    if (!biData?.inventoryMaster) return 0;
    const inv = biData.inventoryMaster;
    if (selectedPlatform === "All") {
      return inv.reduce((sum: number, item: any) => sum + (Number(item.total_stock) || 0), 0);
    } else if (selectedPlatform === "Amazon") {
      return inv.reduce((sum: number, item: any) => sum + (Number(item.amazon_stock) || 0), 0);
    } else if (selectedPlatform === "Flipkart") {
      return inv.reduce((sum: number, item: any) => sum + (Number(item.flipkart_stock) || 0), 0);
    } else if (selectedPlatform === "Meesho") {
      return inv.reduce((sum: number, item: any) => sum + (Number(item.meesho_stock) || 0), 0);
    }
    return 0;
  }, [biData, selectedPlatform]);

  if (!biData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-slate-50/50 p-6 space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Business Intelligence</h1>
            <p className="text-slate-500 mt-1">
              Real-time insights across your marketplaces
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 text-sm rounded-md focus:ring-primary focus:border-primary block p-2.5 shadow-sm"
            >
              <option value="All">All Connected Platforms</option>
              {availablePlatforms.map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="text-sm text-muted-foreground bg-white px-3 py-1 rounded-full border shadow-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {dailyData.length > 0 ? (
          <>
            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-5"
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
                <StatCard
                  title="Total Revenue"
                  value={`₹${totalRevenue.toLocaleString()}`}
                  icon={DollarSign}
                  trend="up"
                  subtext="Gross revenue"
                />
                <StatCard
                  title="Net Profit"
                  value={`₹${totalProfit.toLocaleString()}`}
                  icon={Activity}
                  trend={totalProfit > 0 ? "up" : "down"}
                  subtext={`${avgMargin}% margin`}
                />
                <StatCard
                  title="Units Sold"
                  value={totalUnits.toLocaleString()}
                  icon={Package}
                  trend="up"
                  subtext="Total items dispatched"
                />
                <StatCard
                  title="Avg. Margin"
                  value={`${avgMargin}%`}
                  icon={TrendingUp}
                  trend={avgMargin > 15 ? "up" : "neutral"}
                  subtext="Target: >20%"
                />
                <StatCard
                  title="Total Inventory"
                  value={totalInventory.toLocaleString()}
                  icon={Package}
                  trend="neutral"
                  subtext={selectedPlatform === "All" ? "Total Stock" : `${selectedPlatform} Stock`}
                />
              </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Revenue Trend</h2>
                    <p className="text-sm text-slate-500">Daily revenue performance over time</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Platform Breakdown</h2>
                  <p className="text-sm text-slate-500">Revenue distribution by channel</p>
                </div>
                <div className="space-y-6">
                  {platformTotals.map((p) => {
                    const total = platformTotals.reduce((s, x) => s + x.revenue, 0) || 1;
                    const percent = Math.round((p.revenue / total) * 100);
                    return (
                      <div key={p.platform} className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-700">{p.platform}</span>
                          <span className="text-slate-900">₹{p.revenue.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{percent}% of total</span>
                          <span>{p.units.toLocaleString()} units</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Profit Analysis</h2>
                  <p className="text-sm text-slate-500">Daily net profit (30 days)</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {dailyData.slice(-30).map((d, i) => (
                        <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--primary))" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Demand Forecast
                  </h2>
                  <p className="text-sm text-slate-500">Predicted units sold (Next 14 days)</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" dataKey="actual" name="Historical" stroke="#94a3b8" fill="#e2e8f0" strokeWidth={2} />
                    <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-12 text-center bg-white">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No Analytics Data Ready</h3>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">
              Connect your marketplaces or upload sales data to see insights here.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default BusinessIntelligenceDashboard;
