import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";
import { Button } from "@/components/ui/button";
import { TrendingUp, LogOut, Target, BarChart3, DollarSign, Users, Zap, Award, AlertTriangle, TrendingDown, Search, Settings, Activity, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";
import { useBulkPriceIntelligence, useRecentPriceChanges, usePriceAlerts, useCompetitors } from "@/hooks/use-competitor-intelligence";
import { mergeCompetitorIntelligence, generateCategoryPriceTrend } from "@/lib/competitor-helpers";



export default function PriceSuggestionDashboard() {
    const [selectedMarketplace, setSelectedMarketplace] = useState("All");
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [simulatedPrice, setSimulatedPrice] = useState(0);
    const [autoRepricingEnabled, setAutoRepricingEnabled] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"price" | "gap" | "rank">("gap");

    const { user, logout } = useAuth();
    const { platforms: availablePlatforms } = useFirestorePlatforms();

    // Fetch BI Data
    const { data: biData, isLoading } = useQuery({
        queryKey: ["/api/bi/data"],
        queryFn: async () => {
            const res = await fetch("/api/bi/data", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        },
        staleTime: 60000,
    });

    // Fetch Competitor Intelligence Data
    const { data: priceIntelligenceData, isLoading: intelLoading, error: intelError } = useBulkPriceIntelligence();
    const { data: recentPriceChanges, isLoading: changesLoading, error: changesError } = useRecentPriceChanges(1, 10);
    const { data: priceAlerts, isLoading: alertsLoading, error: alertsError } = usePriceAlerts();
    // Enhanced products with pricing intelligence (using real API data)
    const productsWithPricing = useMemo(() => {
        if (!biData?.inventoryMaster) return [];
        return mergeCompetitorIntelligence(biData.inventoryMaster, priceIntelligenceData);
    }, [biData, priceIntelligenceData]);

    const selectedSku = selectedProduct?.sku || (Array.isArray(productsWithPricing) && productsWithPricing.length > 0 ? productsWithPricing[0].sku : null);
    const { data: competitors, isLoading: compsLoading, error: compsError } = useCompetitors(selectedSku);




    // Overview stats
    const overviewStats = useMemo(() => {
        const total = productsWithPricing.length;
        const avgPrice = productsWithPricing.reduce((sum: number, p: any) => sum + p.currentPrice, 0) / total || 0;
        const optimizationOpportunities = productsWithPricing.filter((p: any) => Math.abs(p.priceGapPercent) > 5).length;
        const potentialRevenue = productsWithPricing.reduce((sum: number, p: any) => sum + p.potentialImpact, 0);
        const competitorCount = productsWithPricing.reduce((sum: number, p: any) => sum + (p.competitorCount || 0), 0);
        const rank1 = productsWithPricing.filter((p: any) => p.rank === 1).length;
        const avgBuyBoxProb = productsWithPricing.reduce((sum: number, p: any) => sum + p.buyBoxProbability, 0) / total || 0;
        const overpriced = productsWithPricing.filter((p: any) => p.priceGapPercent > 5).length;
        const underpriced = productsWithPricing.filter((p: any) => p.priceGapPercent < -5).length;

        return { avgPrice, optimizationOpportunities, potentialRevenue, competitorCount, rank1, avgBuyBoxProb, overpriced, underpriced };
    }, [productsWithPricing]);

    // Price history mock data
    const priceHistory = useMemo(() => {
        if (!selectedProduct) return [];
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                price: selectedProduct.currentPrice * (0.95 + Math.random() * 0.1),
                sales: Math.floor(Math.random() * 50) + 10,
            });
        }
        return data;
    }, [selectedProduct]);

    // Price simulation impact
    const simulationImpact = useMemo(() => {
        if (!selectedProduct || simulatedPrice === 0) return null;
        const priceChange = ((simulatedPrice - selectedProduct.currentPrice) / selectedProduct.currentPrice) * 100;
        const elasticity = selectedProduct.elasticity;
        const demandChange = -elasticity * priceChange;
        const currentSales = 100;
        const newSales = currentSales * (1 + demandChange / 100);
        const currentRevenue = selectedProduct.currentPrice * currentSales;
        const newRevenue = simulatedPrice * newSales;
        const revenueChange = newRevenue - currentRevenue;

        return {
            priceChange: priceChange.toFixed(2),
            demandChange: demandChange.toFixed(2),
            salesChange: (newSales - currentSales).toFixed(0),
            revenueChange: revenueChange.toFixed(2),
            newMargin: selectedProduct.costPrice > 0 ? ((simulatedPrice - selectedProduct.costPrice) / simulatedPrice * 100).toFixed(1) : 0,
        };
    }, [selectedProduct, simulatedPrice]);

    // Filtered competitor data
    const filteredCompetitorData = useMemo(() => {
        let filtered = productsWithPricing;
        if (searchQuery) {
            filtered = filtered.filter((item: any) =>
                item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return filtered.sort((a: any, b: any) => {
            if (sortBy === "price") return b.currentPrice - a.currentPrice;
            if (sortBy === "gap") return Math.abs(b.priceGapPercent) - Math.abs(a.priceGapPercent);
            if (sortBy === "rank") return a.rank - b.rank;
            return 0;
        });
    }, [productsWithPricing, searchQuery, sortBy]);

    // Price trend data
    const priceTrendData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                yourPrice: 1200 + Math.random() * 200,
                competitorAvg: 1250 + Math.random() * 150,
                optimal: 1300 + Math.random() * 100,
            });
        }
        return data;
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Header/Navbar */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <Link href="/landing">
                            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span className="font-display font-bold text-xl tracking-tight">CommercialQ</span>
                            </div>
                        </Link>
                        <Separator orientation="vertical" className="h-6" />
                        <h1 className="text-lg font-semibold">Price Suggestion Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
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

                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={user?.profileImageUrl} />
                                <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <Button variant="ghost" size="sm" onClick={() => logout()}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="dynamic-pricing">Dynamic Pricing</TabsTrigger>
                        <TabsTrigger value="competitor-analysis">Competitor Analysis</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {(intelError || changesError || alertsError) && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <AlertTitle>Data Load Issue</AlertTitle>
                                    <AlertDescription>
                                        {intelError ? "Pricing intelligence failed to load. " : ""}
                                        {changesError ? "Recent price changes failed to load. " : ""}
                                        {alertsError ? "Price alerts failed to load." : ""}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* KPI Cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                                <Card className="border-l-4 border-l-green-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Best Price Position</CardTitle>
                                        <Award className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{overviewStats.rank1}</div>
                                        <p className="text-xs text-muted-foreground">Products ranked #1</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">₹{overviewStats.avgPrice.toFixed(2)}</div>
                                        <p className="text-xs text-muted-foreground">Across all products</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-purple-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
                                        <Users className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{overviewStats.competitorCount}</div>
                                        <p className="text-xs text-muted-foreground">Active competitors</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-orange-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Optimization Opportunities</CardTitle>
                                        <Zap className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{overviewStats.optimizationOpportunities}</div>
                                        <p className="text-xs text-muted-foreground">Products to optimize</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-teal-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Potential Revenue Increase</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-teal-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">₹{overviewStats.potentialRevenue.toFixed(0)}</div>
                                        <p className="text-xs text-muted-foreground">With optimizations</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Price Trend Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Price Trend Analysis</CardTitle>
                                    <CardDescription>Your prices vs. competitor average vs. optimal price (Last 30 days)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={priceTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                                                <RechartsTooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                                                <Line type="monotone" dataKey="yourPrice" stroke="#3b82f6" strokeWidth={2} name="Your Price" dot={false} />
                                                <Line type="monotone" dataKey="competitorAvg" stroke="#ef4444" strokeWidth={2} name="Competitor Avg" dot={false} />
                                                <Line type="monotone" dataKey="optimal" stroke="#10b981" strokeWidth={2} name="Optimal Price" strokeDasharray="5 5" dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <div className="grid gap-6 md:grid-cols-2 mt-6">
                                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("dynamic-pricing")}>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-500 rounded-lg">
                                                <Target className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">Dynamic Pricing</CardTitle>
                                                <CardDescription>AI-powered price optimization</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Get real-time pricing recommendations based on demand, inventory levels, and market conditions.
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab("competitor-analysis")}>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-purple-500 rounded-lg">
                                                <BarChart3 className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">Competitor Analysis</CardTitle>
                                                <CardDescription>Market intelligence & positioning</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Track competitor prices, analyze market trends, and identify opportunities to win the Buy Box.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* DYNAMIC PRICING TAB */}
                    <TabsContent value="dynamic-pricing" className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Auto-Repricing Toggle */}
                            <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <Zap className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle>Automated Repricing</CardTitle>
                                                <CardDescription>Let AI adjust prices automatically based on market conditions</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="auto-repricing" checked={autoRepricingEnabled} onCheckedChange={setAutoRepricingEnabled} />
                                            <Label htmlFor="auto-repricing" className="font-medium">
                                                {autoRepricingEnabled ? "Enabled" : "Disabled"}
                                            </Label>
                                        </div>
                                    </div>
                                </CardHeader>
                                <AnimatePresence>
                                    {autoRepricingEnabled && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                                            <CardContent className="space-y-4">
                                                <Alert>
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    <AlertTitle>Auto-Repricing Active</AlertTitle>
                                                    <AlertDescription>Prices will be adjusted every 6 hours based on competitor pricing and demand signals.</AlertDescription>
                                                </Alert>
                                                <div className="grid gap-4 md:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label>Min Margin (%)</Label>
                                                        <Slider defaultValue={[15]} max={50} step={1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Max Price Change (%)</Label>
                                                        <Slider defaultValue={[10]} max={30} step={1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Update Frequency (hours)</Label>
                                                        <Slider defaultValue={[6]} min={1} max={24} step={1} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>

                            {/* Price Recommendations */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Products to Increase</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">
                                            {productsWithPricing.filter((p: any) => p.recommendation === "increase").length}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Potential revenue gain</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Products to Decrease</CardTitle>
                                        <TrendingDown className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">
                                            {productsWithPricing.filter((p: any) => p.recommendation === "decrease").length}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Boost competitiveness</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Impact</CardTitle>
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">
                                            ₹{productsWithPricing.reduce((sum: number, p: any) => sum + p.potentialImpact, 0).toFixed(0)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Potential revenue change</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Opportunities */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Pricing Opportunities</CardTitle>
                                    <CardDescription>Products with highest optimization potential</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                        {productsWithPricing
                                            .sort((a: any, b: any) => b.potentialImpact - a.potentialImpact)
                                            .slice(0, 10)
                                            .map((product: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setSimulatedPrice(product.optimalPrice);
                                                    }}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{product.product_name || product.sku}</p>
                                                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                                            <span>SKU: {product.sku}</span>
                                                            <span>Demand: {product.demandScore}/100</span>
                                                            <span>Margin: {product.margin}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-muted-foreground">₹{product.currentPrice.toFixed(2)}</span>
                                                            <span className="text-muted-foreground">→</span>
                                                            <span className={`text-sm font-bold ${product.recommendation === 'increase' ? 'text-green-600' : 'text-orange-600'}`}>
                                                                ₹{product.optimalPrice.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs">
                                                            {product.recommendation === 'increase' ? (
                                                                <TrendingUp className="h-3 w-3 text-green-600" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3 text-orange-600" />
                                                            )}
                                                            <span className="text-muted-foreground">Impact: ₹{product.potentialImpact.toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Price Simulator */}
                            {selectedProduct && (
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Price Simulator</CardTitle>
                                            <CardDescription>{selectedProduct.product_name || selectedProduct.sku}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Label>Current Price</Label>
                                                    <span className="text-lg font-bold">₹{selectedProduct.currentPrice.toFixed(2)}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label>Simulated Price</Label>
                                                        <span className="text-lg font-bold text-blue-600">₹{simulatedPrice.toFixed(2)}</span>
                                                    </div>
                                                    <Slider
                                                        value={[simulatedPrice]}
                                                        onValueChange={(value) => setSimulatedPrice(value[0])}
                                                        min={selectedProduct.currentPrice * 0.7}
                                                        max={selectedProduct.currentPrice * 1.3}
                                                        step={0.01}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>

                                            {simulationImpact && (
                                                <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
                                                    <h4 className="font-medium">Projected Impact</h4>
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Price Change</p>
                                                            <p className={`font-bold ${parseFloat(simulationImpact.priceChange) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {parseFloat(simulationImpact.priceChange) > 0 ? '+' : ''}{simulationImpact.priceChange}%
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Demand Change</p>
                                                            <p className={`font-bold ${parseFloat(simulationImpact.demandChange) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {parseFloat(simulationImpact.demandChange) > 0 ? '+' : ''}{simulationImpact.demandChange}%
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Sales Change</p>
                                                            <p className={`font-bold ${parseFloat(simulationImpact.salesChange) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {parseFloat(simulationImpact.salesChange) > 0 ? '+' : ''}{simulationImpact.salesChange} units
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Revenue Change</p>
                                                            <p className={`font-bold ${parseFloat(simulationImpact.revenueChange) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {parseFloat(simulationImpact.revenueChange) > 0 ? '+' : ''}₹{simulationImpact.revenueChange}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <Button className="w-full">Apply Price Change</Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Price & Sales History</CardTitle>
                                            <CardDescription>Last 30 days performance</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={priceHistory}>
                                                        <defs>
                                                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                                        <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                                                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                                                        <RechartsTooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                                                        <Area yAxisId="left" type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#priceGrad)" strokeWidth={2} />
                                                        <Bar yAxisId="right" dataKey="sales" fill="#10b981" opacity={0.6} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </motion.div>
                    </TabsContent>

                    {/* COMPETITOR ANALYSIS TAB */}
                    <TabsContent value="competitor-analysis" className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Market Position Stats */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="border-l-4 border-l-green-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Best Price Position</CardTitle>
                                        <Award className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{overviewStats.rank1}</div>
                                        <p className="text-xs text-muted-foreground">Products ranked #1</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Avg Buy Box Probability</CardTitle>
                                        <Target className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">{overviewStats.avgBuyBoxProb.toFixed(1)}%</div>
                                        <p className="text-xs text-muted-foreground">Chance to win sales</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-orange-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Overpriced Products</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">{overviewStats.overpriced}</div>
                                        <p className="text-xs text-muted-foreground">&gt;5% above competitors</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-purple-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Underpriced Products</CardTitle>
                                        <TrendingDown className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-purple-600">{overviewStats.underpriced}</div>
                                        <p className="text-xs text-muted-foreground">&gt;5% below competitors</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Real-time Competitor Analysis */}
                            <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <Activity className="h-5 w-5 text-white animate-pulse" />
                                            </div>
                                            <div>
                                                <CardTitle>Real-time Competitor Monitoring</CardTitle>
                                                <CardDescription>Live price tracking and instant alerts</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                                                Live
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">Updates every 30s</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Alert>
                                            <Activity className="h-4 w-4 text-blue-600" />
                                            <AlertTitle>Monitoring Active</AlertTitle>
                                            <AlertDescription>
                                                Tracking {productsWithPricing.length} products across {overviewStats.competitorCount} competitors in real-time.
                                                You'll receive instant notifications when competitor prices change.
                                            </AlertDescription>
                                        </Alert>

                                        {/* Recent Price Changes */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-orange-500" />
                                                Recent Price Changes (Last Hour)
                                            </h4>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                {changesLoading && (
                                                    <div className="text-xs text-muted-foreground">Loading recent changes…</div>
                                                )}
                                                {!changesLoading && recentPriceChanges && recentPriceChanges.length === 0 && (
                                                    <div className="text-xs text-muted-foreground">No significant changes detected.</div>
                                                )}
                                                {!changesLoading && recentPriceChanges && recentPriceChanges.map((change: any, i: number) => {
                                                    const isIncrease = change.price_change_percent > 0;
                                                    return (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{change.sku}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs text-muted-foreground">{change.competitor_title}</p>
                                                                    {change.marketplace && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {change.marketplace}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-2">
                                                                    {isIncrease ? (
                                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                                    )}
                                                                    <span className={`font-bold text-sm ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {isIncrease ? '+' : ''}{change.price_change_percent.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{Math.round(change.minutes_ago)} min ago</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Price Alerts */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                Active Price Alerts
                                            </h4>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {alertsLoading && (
                                                    <Alert>
                                                        <Activity className="h-4 w-4 text-blue-600" />
                                                        <AlertDescription className="text-xs">Loading alerts…</AlertDescription>
                                                    </Alert>
                                                )}
                                                {!alertsLoading && priceAlerts && (
                                                    <>
                                                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <AlertDescription className="text-xs">
                                                                <strong>{priceAlerts.overpriced.length} products</strong> are overpriced vs competitors
                                                            </AlertDescription>
                                                        </Alert>
                                                        <Alert className="bg-green-50 border-green-200">
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                            <AlertDescription className="text-xs text-green-800">
                                                                <strong>{priceAlerts.best_price.length} products</strong> have the best market price
                                                            </AlertDescription>
                                                        </Alert>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Auto-Response Settings */}
                                        <div className="pt-3 border-t">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h4 className="font-medium text-sm">Auto-Response to Price Changes</h4>
                                                    <p className="text-xs text-muted-foreground">Automatically adjust prices when competitors change theirs</p>
                                                </div>
                                                <Switch />
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                    <span>Match lowest price within 5 minutes</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                    <span>Maintain minimum 10% margin</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Competitor Comparison */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Product Competitor Comparison</CardTitle>
                                            <CardDescription>Select a product to view competitors and compare prices</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {compsError && (
                                                <Badge variant="outline" className="text-red-700 border-red-300">Failed to load competitors</Badge>
                                            )}
                                            {compsLoading && (
                                                <Badge variant="outline" className="text-blue-700 border-blue-300">Loading…</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-6 lg:grid-cols-3">
                                        <div className="space-y-2 lg:col-span-1">
                                            <Input
                                                placeholder="Search products…"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            <div className="max-h-[300px] overflow-y-auto border rounded-md">
                                                {filteredCompetitorData.slice(0, 30).map((p: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-accent/40 ${selectedSku === p.sku ? 'bg-accent/30' : ''}`}
                                                        onClick={() => setSelectedProduct(p)}
                                                    >
                                                        <div className="truncate">
                                                            <div className="text-sm font-medium truncate">{p.product_name || p.sku}</div>
                                                            <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm">₹{p.currentPrice.toFixed(2)}</div>
                                                            <div className="text-xs text-muted-foreground">{p.competitorCount} comps</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredCompetitorData.length === 0 && (
                                                    <div className="p-3 text-xs text-muted-foreground">No products available</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4 lg:col-span-2">
                                            {selectedSku ? (
                                                <>
                                                    <div className="grid gap-4 md:grid-cols-3">
                                                        <Card className="border-l-4 border-l-blue-500">
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm">Price Gap</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">
                                                                    {(() => {
                                                                        const item = productsWithPricing.find((x: any) => x.sku === selectedSku);
                                                                        const val = item ? item.priceGapPercent : 0;
                                                                        return `${val.toFixed(2)}%`;
                                                                    })()}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                        <Card className="border-l-4 border-l-purple-500">
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm">Rank</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">
                                                                    {(() => {
                                                                        const item = productsWithPricing.find((x: any) => x.sku === selectedSku);
                                                                        return item ? item.rank : 0;
                                                                    })()}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                        <Card className="border-l-4 border-l-green-500">
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm">Buy Box Probability</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">
                                                                    {(() => {
                                                                        const item = productsWithPricing.find((x: any) => x.sku === selectedSku);
                                                                        const val = item ? item.buyBoxProbability : 0;
                                                                        return `${val}%`;
                                                                    })()}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                    <div className="border rounded-md">
                                                        <div className="grid grid-cols-7 gap-2 p-3 text-xs font-medium text-muted-foreground">
                                                            <div>Competitor</div>
                                                            <div>ASIN</div>
                                                            <div>Marketplace</div>
                                                            <div className="text-right">Price</div>
                                                            <div className="text-center">Rank</div>
                                                            <div className="text-center">Rating</div>
                                                            <div className="text-right">Updated</div>
                                                        </div>
                                                        <div className="divide-y">
                                                            {(competitors || []).map((c: any, i: number) => (
                                                                <div key={i} className="grid grid-cols-7 gap-2 p-3 items-center text-sm">
                                                                    <div className="truncate">{c.title}</div>
                                                                    <div className="truncate">{c.asin}</div>
                                                                    <div className="truncate">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {c.marketplace || 'N/A'}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-right">{c.price ? `₹${c.price.toFixed(2)}` : 'N/A'}</div>
                                                                    <div className="text-center">{c.rank ?? '-'}</div>
                                                                    <div className="text-center">{c.seller_rating ?? '-'}</div>
                                                                    <div className="text-right">{c.last_updated ? new Date(c.last_updated).toLocaleString() : '-'}</div>
                                                                </div>
                                                            ))}
                                                            {(!competitors || competitors.length === 0) && (
                                                                <div className="p-3 text-xs text-muted-foreground">No competitors found</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-muted-foreground">Select a product to view competitor comparison</div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Price Trend Comparison */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Price Trend Comparison</CardTitle>
                                    <CardDescription>Your average price vs. competitor average (Last 30 days)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={priceTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                                                <RechartsTooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                                                <Line type="monotone" dataKey="yourPrice" stroke="#3b82f6" strokeWidth={2} name="Your Avg Price" dot={false} />
                                                <Line type="monotone" dataKey="competitorAvg" stroke="#ef4444" strokeWidth={2} name="Competitor Avg" dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Competitor Comparison Table */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Product Comparison</CardTitle>
                                            <CardDescription>Detailed price comparison with competitors</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search products..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-8 w-64"
                                                />
                                            </div>
                                            <select
                                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as any)}
                                            >
                                                <option value="gap">Sort by Price Gap</option>
                                                <option value="price">Sort by Price</option>
                                                <option value="rank">Sort by Rank</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                        {filteredCompetitorData.slice(0, 20).map((product: any, i: number) => (
                                            <div key={i} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium">{product.product_name || product.sku}</p>
                                                            <Badge variant={product.rank === 1 ? "default" : product.rank === 2 ? "secondary" : "outline"}>
                                                                Rank #{product.rank}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Buy Box Probability</p>
                                                        <p className="text-lg font-bold text-blue-600">{product.buyBoxProbability.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Your Price</p>
                                                        <p className="font-bold text-lg">₹{product.currentPrice.toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Lowest Competitor</p>
                                                        <p className="font-bold text-lg text-red-600">
                                                            {product.lowestCompetitorPrice !== null ? `₹${Number(product.lowestCompetitorPrice).toFixed(2)}` : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Price Gap</p>
                                                        <p className={`font-bold text-lg ${product.priceGapPercent > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                            {product.priceGapPercent > 0 ? '+' : ''}{product.priceGapPercent.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Competitor Avg</p>
                                                        <p className="font-bold text-lg">
                                                            {product.avgCompetitorPrice !== null ? `₹${Number(product.avgCompetitorPrice).toFixed(2)}` : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t">
                                                    <p className="text-xs text-muted-foreground mb-2">Competitor Prices</p>
                                                    <div className="flex gap-3">
                                                        {product.competitors.map((comp: any, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                                <Users className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-muted-foreground">{comp.name}:</span>
                                                                <span className="font-medium">₹{comp.price.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {Math.abs(product.priceGapPercent) > 10 && (
                                                    <Alert className="mt-3">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription className="text-xs">
                                                            {product.priceGapPercent > 10
                                                                ? `Your price is ${product.priceGapPercent.toFixed(1)}% higher than competitors. Consider lowering to improve competitiveness.`
                                                                : `Your price is ${Math.abs(product.priceGapPercent).toFixed(1)}% lower than competitors. You may be leaving money on the table.`
                                                            }
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs >
            </main >
        </div >
    );
}
