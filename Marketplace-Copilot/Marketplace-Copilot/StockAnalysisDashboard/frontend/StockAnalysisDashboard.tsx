import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    BarChart3
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
    const [activeTab, setActiveTab] = useState("demand-surge");
    const [surgeData, setSurgeData] = useState<any>(demandSurgeData);
    const [surgeLoading, setSurgeLoading] = useState(false);
    const [surgeError, setSurgeError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function loadSurge() {
            try {
                setSurgeLoading(true);
                const res = await fetch("/api/surge/intelligence?lead=14", { credentials: "include" });
                if (!res.ok) throw new Error("Failed to fetch demand surge intelligence");
                const data = await res.json();
                if (!mounted) return;
                const upcomingEvents = (data?.dashboard?.upcomingEvents || []).map((e: any, idx: number) => ({
                    event: e.event || "Upcoming Event",
                    date: e.date,
                    daysUntil: e.daysUntil,
                    multiplier: e.multiplier,
                    confidence: e.confidence || 80,
                    affectedProducts: [],
                    historicalData: "Historical uplift vs baseline",
                    id: idx + 1
                }));
                const trendingProducts = (data?.dashboard?.trendingProducts || []).map((t: any, idx: number) => ({
                    id: idx + 1,
                    name: t.sku,
                    category: "SKU",
                    currentStock: 0,
                    weeklyGrowth: Math.round((t.trendMultiplier - 1) * 100),
                    trendScore: Math.round(t.trendMultiplier * 100),
                    recommendedStock: 0,
                    reason: t.reasons?.[0] || "Trending"
                }));
                setSurgeData((prev: any) => ({
                    ...prev,
                    upcomingEvents,
                    trendingProducts
                }));
                setSurgeError(null);
            } catch (e: any) {
                setSurgeError(e.message || "Error");
            } finally {
                if (mounted) setSurgeLoading(false);
            }
        }
        loadSurge();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                                <BarChart3 className="w-10 h-10 text-primary" />
                                Stock Analysis Dashboard
                            </h1>
                            <p className="text-gray-400 mt-2 text-lg">
                                Predictive Intelligence for Smart Inventory Management
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Badge variant="outline" className="px-4 py-2 text-sm border-zinc-700 text-gray-300">
                                <Clock className="w-4 h-4 mr-2" />
                                Last Updated: Just Now
                            </Badge>
                            <Badge className="px-4 py-2 text-sm bg-primary text-black">
                                <Zap className="w-4 h-4 mr-2" />
                                AI Powered
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-900 p-2 rounded-xl shadow-lg border border-zinc-800">
                        <TabsTrigger
                            value="demand-surge"
                            className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg py-3 text-base font-semibold text-gray-400"
                        >
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Demand Surge Intelligence
                        </TabsTrigger>
                        <TabsTrigger
                            value="replenishment"
                            className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg py-3 text-base font-semibold text-gray-400"
                        >
                            <CalendarDays className="w-5 h-5 mr-2" />
                            Replenishment Planning
                        </TabsTrigger>
                    </TabsList>

                    {/* Demand Surge Intelligence Tab */}
                    <TabsContent value="demand-surge" className="space-y-6">
                        {/* Upcoming Events & Festivals */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <Sparkles className="w-6 h-6 mr-3 text-primary" />
                                    Upcoming Events & Festival Forecasts
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Predictive spike detection based on historical patterns and seasonal trends
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    {surgeLoading && <div className="text-sm text-gray-400 mb-4">Loading surge intelligence…</div>}
                                    {surgeError && <div className="text-sm text-red-500 mb-4">Error: {surgeError}</div>}
                                    {surgeData.upcomingEvents.map((event: any) => (
                                        <div
                                            key={event.id}
                                            className="bg-zinc-800 p-6 rounded-xl border-2 border-zinc-700 hover:border-primary/50 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Calendar className="w-6 h-6 text-primary" />
                                                        <h3 className="text-xl font-bold text-white">{event.event}</h3>
                                                        <Badge className="bg-orange-600 text-white">
                                                            {event.daysUntil} days away
                                                        </Badge>
                                                    </div>
                                                    <p className="text-gray-400 ml-9">Date: {event.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-bold text-primary">+{event.expectedSpike}%</div>
                                                    <p className="text-sm text-gray-400">Expected Spike</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                                                    <p className="text-sm text-gray-400 mb-1">Stock Multiplier</p>
                                                    <p className="text-2xl font-bold text-primary">{event.multiplier}x</p>
                                                </div>
                                                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                                                    <p className="text-sm text-gray-400 mb-1">Confidence Level</p>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={event.confidence} className="flex-1" />
                                                        <span className="text-lg font-bold text-green-500">{event.confidence}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <p className="text-sm font-semibold text-gray-300 mb-2">Affected Categories:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {event.affectedProducts.map((product: any, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="px-3 py-1 bg-zinc-700 text-gray-200">
                                                            <Package className="w-3 h-3 mr-1" />
                                                            {product}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                                                <p className="text-sm text-primary">
                                                    <strong>Recommendation:</strong> Increase stock by {event.multiplier}x for affected categories. {event.historicalData}.
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trending Products */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <TrendingUp className="w-6 h-6 mr-3 text-primary" />
                                    Trend-Based Stock Alerts
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Real-time trending products requiring immediate attention
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid gap-4">
                                    {surgeData.trendingProducts.map((product: any) => (
                                        <div
                                            key={product.id}
                                            className="bg-zinc-800 p-5 rounded-xl border-2 border-zinc-700 hover:border-primary/50 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-white">{product.name}</h4>
                                                    <p className="text-sm text-gray-400">{product.category}</p>
                                                </div>
                                                <Badge className="bg-green-600 text-white px-3 py-1">
                                                    Trend Score: {product.trendScore}/100
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-4 gap-3 mb-3">
                                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-center">
                                                    <p className="text-xs text-gray-400 mb-1">Current Stock</p>
                                                    <p className="text-lg font-bold text-white">{product.currentStock}</p>
                                                </div>
                                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-center">
                                                    <p className="text-xs text-gray-400 mb-1">Weekly Growth</p>
                                                    <p className="text-lg font-bold text-green-500">+{product.weeklyGrowth}%</p>
                                                </div>
                                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-center">
                                                    <p className="text-xs text-gray-400 mb-1">Recommended</p>
                                                    <p className="text-lg font-bold text-primary">{product.recommendedStock}</p>
                                                </div>
                                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-center">
                                                    <p className="text-xs text-gray-400 mb-1">Increase</p>
                                                    <p className="text-lg font-bold text-orange-500">
                                                        +{product.recommendedStock - product.currentStock}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-amber-950/50 p-3 rounded-lg border border-amber-800/50 flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-amber-200">
                                                    <strong>Insight:</strong> {product.reason}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Seasonal Patterns */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <Calendar className="w-6 h-6 mr-3 text-primary" />
                                    Seasonal Demand Patterns
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Historical seasonal trends for strategic planning
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    {demandSurgeData.seasonalPatterns.map((season, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-zinc-800 p-5 rounded-xl border-2 border-zinc-700"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-lg font-bold text-white">{season.season}</h4>
                                                <Badge variant="outline" className="text-sm border-zinc-600 text-gray-300">{season.months}</Badge>
                                            </div>
                                            <div className="mb-3">
                                                <p className="text-sm text-gray-400 mb-1">Average Demand Increase</p>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={season.avgIncrease} className="flex-1" />
                                                    <span className="text-xl font-bold text-primary">+{season.avgIncrease}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-300 mb-2">Top Categories:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {season.topCategories.map((cat, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs bg-zinc-700 text-gray-200">
                                                            {cat}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Automated Replenishment Planning Tab */}
                    <TabsContent value="replenishment" className="space-y-6">
                        {/* Budget Overview */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <Card className="shadow-2xl border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-lg text-white">
                                        <DollarSign className="w-5 h-5 mr-2 text-primary" />
                                        Monthly Budget
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-primary">
                                        ₹{replenishmentData.monthlyBudget.allocated.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">Allocated for February</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-2xl border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-lg text-white">
                                        <ShoppingCart className="w-5 h-5 mr-2 text-green-500" />
                                        Planned Spending
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-green-500">
                                        ₹{replenishmentData.monthlyBudget.totalPlanned.toLocaleString()}
                                    </p>
                                    <Progress value={replenishmentData.monthlyBudget.utilizationRate} className="mt-2" />
                                    <p className="text-sm text-gray-400 mt-1">
                                        {replenishmentData.monthlyBudget.utilizationRate}% Utilization
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-2xl border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-lg text-white">
                                        <TrendingDown className="w-5 h-5 mr-2 text-gray-400" />
                                        Remaining Budget
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-gray-300">
                                        ₹{replenishmentData.monthlyBudget.remaining.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">Available for adjustments</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Weekly Replenishment Plan */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <CalendarDays className="w-6 h-6 mr-3 text-primary" />
                                    4-Week Replenishment Schedule
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Automated purchase planning aligned with cash flow
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    {replenishmentData.weeklyPlan.map((week, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-zinc-800 p-6 rounded-xl border-2 border-zinc-700"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-white">{week.week}</h3>
                                                <div className="flex items-center gap-3">
                                                    <Badge
                                                        className={`px-3 py-1 ${week.cashFlowImpact === 'High'
                                                                ? 'bg-red-600'
                                                                : week.cashFlowImpact === 'Medium'
                                                                    ? 'bg-orange-600'
                                                                    : 'bg-green-600'
                                                            } text-white`}
                                                    >
                                                        {week.cashFlowImpact} Cash Flow Impact
                                                    </Badge>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-400">Total Budget</p>
                                                        <p className="text-xl font-bold text-primary">
                                                            ₹{week.totalBudget.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {week.products.map((product, pIdx) => (
                                                    <div
                                                        key={pIdx}
                                                        className="bg-zinc-900 p-4 rounded-lg border border-zinc-700 hover:border-primary/50 transition-all"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-bold text-white">{product.name}</h4>
                                                                    <Badge
                                                                        variant={
                                                                            product.priority === 'High'
                                                                                ? 'destructive'
                                                                                : product.priority === 'Medium'
                                                                                    ? 'default'
                                                                                    : 'secondary'
                                                                        }
                                                                        className="text-xs"
                                                                    >
                                                                        {product.priority} Priority
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-gray-400">Supplier: {product.supplier}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-bold text-green-500">
                                                                    ₹{product.estimatedCost.toLocaleString()}
                                                                </p>
                                                                <p className="text-xs text-gray-400">Lead Time: {product.leadTime}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="bg-zinc-800 p-2 rounded text-center border border-zinc-700">
                                                                <p className="text-xs text-gray-400">Current Stock</p>
                                                                <p className="text-sm font-bold text-white">{product.currentStock}</p>
                                                            </div>
                                                            <div className="bg-zinc-800 p-2 rounded text-center border border-zinc-700">
                                                                <p className="text-xs text-gray-400">Reorder Point</p>
                                                                <p className="text-sm font-bold text-orange-500">{product.reorderPoint}</p>
                                                            </div>
                                                            <div className="bg-zinc-800 p-2 rounded text-center border border-zinc-700">
                                                                <p className="text-xs text-gray-400">Order Quantity</p>
                                                                <p className="text-sm font-bold text-green-500">{product.orderQuantity}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button className="w-full mt-4 bg-primary text-black hover:bg-primary/90">
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Generate Purchase Orders for {week.week}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bulk Discount Opportunities */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <DollarSign className="w-6 h-6 mr-3 text-green-500" />
                                    Bulk Discount Opportunities
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Maximize savings through strategic bulk purchasing
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {replenishmentData.bulkDiscounts.map((discount, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-zinc-800 p-5 rounded-xl border-2 border-zinc-700"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-white mb-1">{discount.supplier}</h4>
                                                    <p className="text-sm text-gray-300 font-semibold">{discount.discount}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Valid until: {discount.validUntil}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">Potential Saving</p>
                                                    <p className="text-2xl font-bold text-green-500">
                                                        ₹{discount.potentialSaving.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                                                <p className="text-sm text-primary">
                                                    <strong>💡 Recommendation:</strong> {discount.recommendedAction}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cash Flow Calendar */}
                        <Card className="shadow-2xl border-zinc-800 bg-zinc-900">
                            <CardHeader className="bg-zinc-800/50 border-b border-zinc-700">
                                <CardTitle className="flex items-center text-2xl text-white">
                                    <Calendar className="w-6 h-6 mr-3 text-primary" />
                                    Cash Flow Aligned Calendar
                                </CardTitle>
                                <CardDescription className="text-base text-gray-400">
                                    Synchronized purchasing with expected revenue
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {replenishmentData.cashFlowCalendar.map((entry, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg border-2 flex items-center justify-between ${entry.category === 'Replenishment'
                                                    ? 'bg-red-950/30 border-red-800/50'
                                                    : 'bg-green-950/30 border-green-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${entry.category === 'Replenishment'
                                                        ? 'bg-red-900/50'
                                                        : 'bg-green-900/50'
                                                    }`}>
                                                    {entry.category === 'Replenishment' ? (
                                                        <ShoppingCart className="w-6 h-6 text-red-400" />
                                                    ) : (
                                                        <DollarSign className="w-6 h-6 text-green-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{entry.date}</p>
                                                    <p className="text-sm text-gray-400">{entry.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-bold ${entry.category === 'Replenishment'
                                                        ? 'text-red-400'
                                                        : 'text-green-400'
                                                    }`}>
                                                    {entry.category === 'Replenishment' ? '-' : '+'}₹{(entry.outflow || entry.inflow || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
