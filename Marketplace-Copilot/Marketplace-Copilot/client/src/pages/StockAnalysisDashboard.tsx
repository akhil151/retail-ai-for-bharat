import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockRecommendation from "@/features/inventory/StockRecommendation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Calendar,
    TrendingUp,
    AlertTriangle,
    Package,
    ShoppingCart,
    Sparkles,
    CalendarDays,
    DollarSign,
    TrendingDown,
    Clock,
    Zap,
    BarChart3,
    LogOut,
    ArrowLeft,
    Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Mock data for Demand Surge Intelligence
const demandSurgeData = {
    upcomingEvents: [
        {
            id: 1,
            event: "Diwali Festival",
            date: "2026-10-20",
            daysUntil: 248,
            expectedSpike: 60,
            multiplier: 1.6,
            affectedProducts: ["Electronics", "Home Decor", "Clothing", "Sweets"],
            confidence: 92,
            historicalData: "Based on last 3 years average"
        },
        {
            id: 2,
            event: "Summer Sale Season",
            date: "2026-05-01",
            daysUntil: 76,
            expectedSpike: 45,
            multiplier: 1.45,
            affectedProducts: ["Clothing", "Footwear", "Accessories"],
            confidence: 88,
            historicalData: "Based on last 5 years average"
        },
        {
            id: 3,
            event: "Back to School",
            date: "2026-06-15",
            daysUntil: 121,
            expectedSpike: 35,
            multiplier: 1.35,
            affectedProducts: ["Stationery", "Bags", "Electronics"],
            confidence: 85,
            historicalData: "Based on last 4 years average"
        }
    ],
    trendingProducts: [
        {
            id: 1,
            name: "Wireless Earbuds Pro",
            category: "Electronics",
            currentStock: 150,
            weeklyGrowth: 25,
            trendScore: 95,
            recommendedStock: 240,
            reason: "Viral social media trend detected"
        },
        {
            id: 2,
            name: "Organic Green Tea",
            category: "Beverages",
            currentStock: 200,
            weeklyGrowth: 18,
            trendScore: 87,
            recommendedStock: 280,
            reason: "Health trend + influencer promotion"
        },
        {
            id: 3,
            name: "Smart Watch Series X",
            category: "Electronics",
            currentStock: 80,
            weeklyGrowth: 32,
            trendScore: 92,
            recommendedStock: 160,
            reason: "New model launch + competitor stockout"
        },
        {
            id: 4,
            name: "Yoga Mat Premium",
            category: "Fitness",
            currentStock: 120,
            weeklyGrowth: 15,
            trendScore: 78,
            recommendedStock: 165,
            reason: "Seasonal fitness trend"
        }
    ],
    seasonalPatterns: [
        {
            season: "Spring",
            months: "Mar-May",
            avgIncrease: 22,
            topCategories: ["Gardening", "Outdoor", "Clothing"]
        },
        {
            season: "Summer",
            months: "Jun-Aug",
            avgIncrease: 18,
            topCategories: ["Beverages", "Cooling", "Travel"]
        },
        {
            season: "Monsoon",
            months: "Jul-Sep",
            avgIncrease: 15,
            topCategories: ["Umbrellas", "Rainwear", "Indoor Games"]
        },
        {
            season: "Winter",
            months: "Nov-Feb",
            avgIncrease: 28,
            topCategories: ["Heaters", "Warm Clothing", "Hot Beverages"]
        }
    ]
};

// Mock data for Automated Replenishment Planning
const replenishmentData = {
    weeklyPlan: [
        {
            week: "Week 1 (Feb 15-21)",
            products: [
                {
                    name: "Wireless Earbuds Pro",
                    currentStock: 150,
                    reorderPoint: 180,
                    orderQuantity: 200,
                    estimatedCost: 45000,
                    supplier: "TechSupply Co.",
                    leadTime: "3 days",
                    priority: "High"
                },
                {
                    name: "Organic Green Tea",
                    currentStock: 200,
                    reorderPoint: 220,
                    orderQuantity: 150,
                    estimatedCost: 12000,
                    supplier: "Natural Foods Ltd.",
                    leadTime: "5 days",
                    priority: "Medium"
                }
            ],
            totalBudget: 57000,
            cashFlowImpact: "Low"
        },
        {
            week: "Week 2 (Feb 22-28)",
            products: [
                {
                    name: "Smart Watch Series X",
                    currentStock: 80,
                    reorderPoint: 120,
                    orderQuantity: 150,
                    estimatedCost: 112500,
                    supplier: "SmartTech Distributors",
                    leadTime: "7 days",
                    priority: "High"
                },
                {
                    name: "Yoga Mat Premium",
                    currentStock: 120,
                    reorderPoint: 140,
                    orderQuantity: 100,
                    estimatedCost: 18000,
                    supplier: "Fitness Gear Inc.",
                    leadTime: "4 days",
                    priority: "Medium"
                }
            ],
            totalBudget: 130500,
            cashFlowImpact: "Medium"
        },
        {
            week: "Week 3 (Mar 1-7)",
            products: [
                {
                    name: "LED Desk Lamp",
                    currentStock: 90,
                    reorderPoint: 100,
                    orderQuantity: 120,
                    estimatedCost: 28800,
                    supplier: "Lighting Solutions",
                    leadTime: "6 days",
                    priority: "Low"
                },
                {
                    name: "Protein Powder 1kg",
                    currentStock: 150,
                    reorderPoint: 160,
                    orderQuantity: 80,
                    estimatedCost: 32000,
                    supplier: "Nutrition Hub",
                    leadTime: "3 days",
                    priority: "Medium"
                }
            ],
            totalBudget: 60800,
            cashFlowImpact: "Low"
        },
        {
            week: "Week 4 (Mar 8-14)",
            products: [
                {
                    name: "Bluetooth Speaker",
                    currentStock: 60,
                    reorderPoint: 100,
                    orderQuantity: 180,
                    estimatedCost: 54000,
                    supplier: "Audio Tech Ltd.",
                    leadTime: "5 days",
                    priority: "High"
                }
            ],
            totalBudget: 54000,
            cashFlowImpact: "Low"
        }
    ],
    bulkDiscounts: [
        {
            supplier: "TechSupply Co.",
            discount: "15% off on orders above ₹100,000",
            validUntil: "2026-03-31",
            potentialSaving: 15000,
            recommendedAction: "Combine Week 1 & Week 2 orders"
        },
        {
            supplier: "SmartTech Distributors",
            discount: "20% off on orders above ₹150,000",
            validUntil: "2026-02-28",
            potentialSaving: 22500,
            recommendedAction: "Order now to maximize savings"
        },
        {
            supplier: "Natural Foods Ltd.",
            discount: "10% off on orders above ₹50,000",
            validUntil: "2026-04-15",
            potentialSaving: 5000,
            recommendedAction: "Accumulate orders for bulk purchase"
        }
    ],
    monthlyBudget: {
        totalPlanned: 302300,
        allocated: 350000,
        remaining: 47700,
        utilizationRate: 86
    },
    cashFlowCalendar: [
        { date: "Feb 15", outflow: 57000, category: "Replenishment" },
        { date: "Feb 22", outflow: 130500, category: "Replenishment" },
        { date: "Feb 25", inflow: 85000, category: "Expected Sales" },
        { date: "Mar 1", outflow: 60800, category: "Replenishment" },
        { date: "Mar 5", inflow: 120000, category: "Expected Sales" },
        { date: "Mar 8", outflow: 54000, category: "Replenishment" },
        { date: "Mar 12", inflow: 95000, category: "Expected Sales" }
    ]
};

export default function StockAnalysisDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState("demand-surge");
    const [surgeData, setSurgeData] = useState<any>({ upcomingEvents: [], trendingProducts: [] });
    const [surgeLoading, setSurgeLoading] = useState(false);
    const [surgeError, setSurgeError] = useState<string | null>(null);
    const [repl, setRepl] = useState<any>({
        weeklyPlan: [],
        bulkDiscounts: [],
        monthlyBudget: { totalPlanned: 0, allocated: 0, remaining: 0, utilizationRate: 0 },
        cashFlowCalendar: []
    });

    useEffect(() => {
        let mounted = true;
        async function loadSurge() {
            try {
                setSurgeLoading(true);
                const res = await fetch("/api/surge/intelligence?lead=14", { credentials: "include" });
                if (!res.ok) {
                    const errorText = await res.text();
                    let errorMessage = "Failed to fetch demand surge intelligence";
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.details || errorJson.message || errorMessage;
                    } catch (e) {
                        // use raw text if json parse fails
                        if (errorText.length < 200) errorMessage = errorText;
                    }
                    throw new Error(errorMessage);
                }
                const data = await res.json();
                if (!mounted) return;
                // Build SKU -> result map
                const resultsBySku: Record<string, any> = {};
                (data?.results || []).forEach((r: any) => {
                    if (r && r.sku) resultsBySku[r.sku] = r;
                });
                // Enrich with inventory master and product catalog (for category)
                let skuToMeta: Record<string, { name?: string; category?: string; stock?: number }> = {};
                try {
                    const biRes = await fetch("/api/bi/data", { credentials: "include" });
                    if (biRes.ok) {
                        const bi = await biRes.json();
                        const inv = bi?.inventoryMaster || [];
                        inv.forEach((item: any) => {
                            const total = Number(item.total_stock ?? 0)
                                || (Number(item.amazon_stock ?? 0) + Number(item.flipkart_stock ?? 0) + Number(item.meesho_stock ?? 0));
                            skuToMeta[item.sku] = {
                                name: item.product_name || undefined,
                                category: undefined,
                                stock: Number.isFinite(total) ? total : 0
                            };
                        });
                    }
                } catch (_) {
                    // best effort only
                }
                // Pull categories and better names from /api/products
                try {
                    const prodRes = await fetch("/api/products", { credentials: "include" });
                    if (prodRes.ok) {
                        const prods = await prodRes.json();
                        (prods || []).forEach((p: any) => {
                            const entry = skuToMeta[p.sku] || {};
                            skuToMeta[p.sku] = {
                                name: entry.name || p.product_title || p.name,
                                category: entry.category || p.category || p.sub_category,
                                stock: entry.stock
                            };
                        });
                    }
                } catch (_) {}
                const upcomingEvents = (data?.dashboard?.upcomingEvents || []).slice(0, 3).map((e: any, idx: number) => {
                    const meta = e.sku ? skuToMeta[e.sku] : undefined;
                    const expectedSpike = Math.max(0, Math.round(((e.multiplier ?? 1) - 1) * 100));
                    const baseCategories: string[] = [];
                    if (Array.isArray(e.categories)) {
                        e.categories.forEach((c: any) => {
                            if (c && typeof c === "string") baseCategories.push(c);
                        });
                    }
                    if (meta?.category && !baseCategories.includes(meta.category)) {
                        baseCategories.push(meta.category);
                    }
                    return {
                        event: e.event || "Upcoming Event",
                        date: e.date,
                        daysUntil: e.daysUntil,
                        multiplier: e.multiplier,
                        expectedSpike,
                        confidence: e.confidence || 80,
                        affectedProducts: baseCategories,
                        spikeDays: e.durationDays || 1,
                        historicalData: "Historical uplift vs baseline",
                        id: idx + 1
                    };
                });
                // Replace Trend-Based Alerts with Top 5 Internet Trends
                let trendingProducts: any[] = [];
                try {
                    const trendsRes = await fetch("/api/trends/top5", { credentials: "include" });
                    if (trendsRes.ok) {
                        const webTrends = await trendsRes.json();
                        trendingProducts = (webTrends || []).slice(0, 5).map((t: any, i: number) => {
                            const meta = skuToMeta[t.sku] || {};
                            const name = t.productName || meta.name || t.sku;
                            const currentStock = Number(meta.stock ?? t.currentStock ?? 0);
                            const weeklyGrowth = Math.round(((t.trendMultiplier ?? 1) - 1) * 100);
                            return {
                                id: i + 1,
                                name,
                                category: meta.category || t.category || "SKU",
                                currentStock,
                                weeklyGrowth,
                                trendScore: Math.round((t.trendMultiplier ?? 1) * 100),
                                recommendedStock: Math.max(currentStock, Math.round(currentStock * (t.trendMultiplier ?? 1))),
                                reason: Array.isArray(t.reasons) && t.reasons.length > 0 ? t.reasons[0] : "Web trend",
                                externalTrendScore: t.webTrendScore,
                                isViral: weeklyGrowth >= 15
                            };
                        });
                    } else {
                        trendingProducts = [];
                    }
                } catch (_) {
                    trendingProducts = [];
                }
                setSurgeData((prev: any) => ({
                    ...prev,
                    upcomingEvents,
                    trendingProducts
                }));
                setSurgeError(null);
            } catch (e: any) {
                console.error("Surge Intelligence Error:", e);
                setSurgeError(e.message || "Unknown Error");
            } finally {
                if (mounted) setSurgeLoading(false);
            }
        }
        loadSurge();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        async function loadReplenishment() {
            try {
                const res = await fetch("/api/inventory-optimization", { credentials: "include" });
                if (!res.ok) return;
                const data = await res.json();
                if (!mounted) return;
                const items = Array.isArray(data?.items) ? data.items : [];
                const increase = items.filter((i: any) => i.decision === "INCREASE");
                const plannedCosts = increase.map((i: any) => {
                    const delta = Math.max(0, (i.optimized_stock_level || 0) - (i.current_stock || 0));
                    const unitCost = (i.stock_value && i.current_stock) ? i.stock_value / Math.max(1, i.current_stock) : 0;
                    return { name: i.product_name || i.sku, delta, cost: Math.round(delta * unitCost) };
                });
                const totalPlanned = plannedCosts.reduce((s: number, r: any) => s + r.cost, 0);
                const allocated = Math.round((data?.metrics?.total_stock_value || 0));
                const remaining = Math.max(0, allocated - totalPlanned);
                const utilizationRate = allocated > 0 ? Math.round((totalPlanned / allocated) * 100) : 0;
                const byWeek: any[][] = [[], [], [], []];
                plannedCosts.forEach((r: any, idx: number) => byWeek[idx % 4].push(r));
                const now = new Date();
                const weeks = byWeek.map((arr, i) => {
                    const start = new Date(now);
                    start.setDate(now.getDate() + i * 7);
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    const label = `Week ${i + 1} (${start.toLocaleString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleString('en-US', { month: 'short', day: 'numeric' })})`;
                    const totalBudget = arr.reduce((s: number, r: any) => s + r.cost, 0);
                    return {
                        week: label,
                        products: arr.map((r: any) => ({
                            name: r.name,
                            currentStock: null,
                            reorderPoint: null,
                            orderQuantity: r.delta,
                            estimatedCost: r.cost,
                            supplier: "Default Supplier",
                            leadTime: "5 days",
                            priority: r.delta > 100 ? "High" : r.delta > 50 ? "Medium" : "Low"
                        })),
                        totalBudget,
                        cashFlowImpact: totalBudget > 100000 ? "High" : totalBudget > 50000 ? "Medium" : "Low"
                    };
                });
                const cashFlowCalendar = weeks.map((w: any, i: number) => ({
                    date: `W${i + 1}`,
                    outflow: w.totalBudget,
                    category: "Replenishment"
                }));
                setRepl({
                    weeklyPlan: weeks,
                    bulkDiscounts: [],
                    monthlyBudget: { totalPlanned, allocated, remaining, utilizationRate },
                    cashFlowCalendar
                });
            } catch {}
        }
        loadReplenishment();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Header/Navbar - Standalone Style */}
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
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            Stock Analysis Dashboard
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/landing">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
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

            <main className="flex-1 container px-4 py-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Predictive Stock Intelligence</h1>
                        <p className="text-muted-foreground mt-1">
                            AI-driven demand forecasting and replenishment planning to optimize inventory.
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                        <Badge variant="outline" className="px-3 py-1 bg-background">
                            <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Updated: Just Now
                        </Badge>
                        <Badge className="px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
                            <Zap className="w-3.5 h-3.5 mr-2" />
                            AI Model Active
                        </Badge>
                    </div>
                </div>

                {/* Error Alert */}
                {surgeError && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Engine Error</AlertTitle>
                        <AlertDescription>
                            {surgeError}. <br />
                            <span className="text-xs opacity-80">Check server logs or ensure Python dependencies (psycopg2, statsmodels, pandas, numpy) are installed.</span>
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex justify-center w-full">
                        <TabsList className="grid w-full max-w-xl grid-cols-3">
                            <TabsTrigger value="demand-surge">Demand Surge Intelligence</TabsTrigger>
                            <TabsTrigger value="replenishment">Replenishment Planning</TabsTrigger>
                            <TabsTrigger value="inventory-optimization">Inventory Optimization</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="demand-surge" className="space-y-6 animate-in fade-in-50 duration-500">
                        {/* Upcoming Events & Festivals */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Upcoming Events & Forecasts
                                    </CardTitle>
                                    <CardDescription>
                                        Predictive spike detection based on historical seasonal trends
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {surgeLoading && (
                                        <div className="col-span-full py-10 flex items-center justify-center text-muted-foreground">
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
                                            Loading demand surge intelligence…
                                        </div>
                                    )}
                                    {!surgeLoading && surgeData.upcomingEvents.filter((e: any) => (e.daysUntil ?? 0) >= 1).map((event: any) => (
                                        <Card key={event.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg">{event.event}</h3>
                                                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                                                            <Calendar className="w-4 h-4 mr-1" />
                                                            {event.date}
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">
                                                        {event.daysUntil === 0 ? "Today" : `${event.daysUntil} days`}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex items-end justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Expected Spike</p>
                                                        <p className="text-2xl font-bold text-primary">+{event.expectedSpike}%</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Multiplier</p>
                                                        <p className="font-bold">{event.multiplier}x</p>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-muted-foreground">
                                                    Spike Window: <span className="font-medium">{event.spikeDays || 1} day{(event.spikeDays || 1) > 1 ? "s" : ""}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span>Confidence</span>
                                                        <span className="font-medium text-green-600">{event.confidence}%</span>
                                                    </div>
                                                    <Progress value={event.confidence} className="h-2" />
                                                </div>

                                                <div className="pt-2 border-t">
                                                    <p className="text-xs font-medium mb-2">Affected Categories:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {event.affectedProducts.map((product: any, idx: number) => (
                                                            <Badge key={idx} variant="outline" className="text-xs font-normal">
                                                                {product}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trending Products */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Trend-Based Stock Alerts
                                </CardTitle>
                                <CardDescription>
                                    Real-time trending products requiring immediate attention
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {surgeData.trendingProducts.map((product: any) => (
                                        <div
                                            key={product.id}
                                            className="flex flex-col md:flex-row items-start md:items-center p-4 border rounded-lg hover:bg-accent/40 transition-colors gap-4"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{product.name}</h4>
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                                        Trend Score: {product.trendScore}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{product.category}</p>
                                                <div className="flex items-center gap-2 text-sm text-amber-600 mt-1">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    {product.reason}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Current Stock</p>
                                                    <p className="font-bold">{product.currentStock}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Weekly Growth</p>
                                                    <p className="font-bold text-green-600">+{product.weeklyGrowth}%</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Recommended</p>
                                                    <p className="font-bold text-primary">{product.recommendedStock}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">Action</p>
                                                    <p className="font-bold text-orange-600">
                                                        +{product.recommendedStock - product.currentStock}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div />
                    </TabsContent>

                    <TabsContent value="inventory-optimization" className="space-y-6 animate-in fade-in-50 duration-500">
                        <StockRecommendation />
                    </TabsContent>

                    <TabsContent value="replenishment" className="space-y-6 animate-in fade-in-50 duration-500">
                        {/* Budget Overview */}
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="border-l-4 border-l-primary bg-primary/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Monthly Budget
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{repl.monthlyBudget.allocated.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Allocated for current month</p>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-green-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Planned Spending
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">₹{repl.monthlyBudget.totalPlanned.toLocaleString()}</div>
                                    <Progress value={repl.monthlyBudget.utilizationRate} className="h-1.5 mt-2" />
                                    <p className="text-xs text-muted-foreground mt-1">{repl.monthlyBudget.utilizationRate}% Utilization</p>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                                        <TrendingDown className="w-4 h-4 mr-2" />
                                        Remaining Budget
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">₹{repl.monthlyBudget.remaining.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Available for adjustments</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Weekly Plan */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-primary" />
                                    Replenishment Schedule
                                </CardTitle>
                                <CardDescription>Automated purchase planning aligned with cash flow</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {repl.weeklyPlan.map((week: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 border-l-2 border-border pb-2 last:pb-0">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                                                <h3 className="font-bold text-lg">{week.week}</h3>
                                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                    <Badge variant={week.cashFlowImpact === 'High' ? 'destructive' : week.cashFlowImpact === 'Medium' ? 'default' : 'secondary'} className={week.cashFlowImpact === 'Medium' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                                                        {week.cashFlowImpact} Impact
                                                    </Badge>
                                                    <span className="font-semibold text-sm">₹{week.totalBudget.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 mb-4">
                                                {week.products.map((product: any, pIdx: number) => (
                                                    <div key={pIdx} className="bg-accent/30 p-3 rounded-md border flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{product.name}</span>
                                                                {product.priority === 'High' && <Badge variant="destructive" className="h-5 text-[10px] px-1.5">High Priority</Badge>}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{product.supplier} • Lead Time: {product.leadTime}</p>
                                                        </div>
                                                        <div className="flex items-center gap-6 text-sm">
                                                            <div className="text-center">
                                                                <p className="text-xs text-muted-foreground">Order Qty</p>
                                                                <p className="font-mono">{product.orderQuantity}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs text-muted-foreground">Est. Cost</p>
                                                                <p className="font-mono font-medium">₹{product.estimatedCost.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                                <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                                                Review Purchase Orders
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bottom Row - Bulk Discounts & Cash Flow */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Bulk Opportunities
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {repl.bulkDiscounts.map((discount: any, idx: number) => (
                                            <div key={idx} className="p-4 border rounded-lg bg-green-50/50 border-green-100 dark:bg-green-950/10 dark:border-green-900">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold">{discount.supplier}</h4>
                                                    <span className="font-bold text-green-600">Save ₹{discount.potentialSaving.toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">{discount.discount}</p>
                                                <p className="text-xs text-muted-foreground mb-3">Valid until {discount.validUntil}</p>
                                                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 p-2 rounded">
                                                    <Zap className="w-3 h-3" />
                                                    {discount.recommendedAction}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        Cash Flow Calendar
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {repl.cashFlowCalendar.map((entry: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.category === 'Replenishment' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                        {entry.category === 'Replenishment' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{entry.date}</p>
                                                        <p className="text-xs text-muted-foreground">{entry.category}</p>
                                                    </div>
                                                </div>
                                                <p className={`font-mono text-sm font-medium ${entry.category === 'Replenishment' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {entry.category === 'Replenishment' ? '-' : '+'}₹{(entry.outflow || entry.inflow || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
