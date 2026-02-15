import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Award, AlertTriangle, Target, Users, ArrowUpDown, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";
import { Input } from "@/components/ui/input";
import { useBulkPriceIntelligence, useCompetitors } from "@/hooks/use-competitor-intelligence";

export default function CompetitorAnalysis() {
    const [selectedMarketplace, setSelectedMarketplace] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"price" | "gap" | "rank">("gap");
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const { user } = useAuth();
    const { platforms: availablePlatforms } = useFirestorePlatforms();

    // Fetch BI Data for product info
    const { data: biData, isLoading: biLoading, error: biError } = useQuery({
        queryKey: ["/api/bi/data"],
        queryFn: async () => {
            const res = await fetch("/api/bi/data", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        },
        staleTime: 60000,
    });

    // Fetch real competitor intelligence data
    const { data: intelligenceData, isLoading: intelligenceLoading } = useBulkPriceIntelligence();

    // Fetch competitors for selected SKU
    const { data: competitors } = useCompetitors(selectedSku);

    const isLoading = biLoading || intelligenceLoading;
    const error = biError;

    // Combine BI data with intelligence data
    const competitorData = useMemo(() => {
        if (!biData?.inventoryMaster || !intelligenceData) return [];

        return biData.inventoryMaster.map((item: any) => {
            const intel = intelligenceData.find((i: any) => i.sku === item.sku);

            if (!intel) {
                // No intelligence data available, use basic product data
                const yourPrice = parseFloat(item.selling_price || item.mrp || 0);
                return {
                    ...item,
                    yourPrice,
                    lowestCompetitorPrice: null,
                    avgCompetitorPrice: null,
                    priceGap: 0,
                    priceGapPercent: 0,
                    rank: 1,
                    buyBoxProbability: 90,
                    competitors: [],
                    competitorCount: 0,
                };
            }

            const yourPrice = intel.your_price;
            const lowestPrice = intel.lowest_price || yourPrice;
            const avgPrice = intel.avg_price || yourPrice;
            const priceGap = yourPrice - lowestPrice;
            const priceGapPercent = lowestPrice > 0 ? (priceGap / lowestPrice) * 100 : 0;

            // Calculate rank (1 = best price)
            let rank = 1;
            if (intel.lowest_price && yourPrice > intel.lowest_price) {
                rank = 2; // At least second if not the lowest
                if (intel.avg_price && yourPrice > intel.avg_price) {
                    rank = 3; // Third or worse if above average
                }
            }

            // Calculate buy box probability based on price position
            const buyBoxProbability = rank === 1
                ? Math.min(99, 90 + Math.abs(priceGapPercent))
                : Math.max(5, 50 - (priceGapPercent * 2));

            return {
                ...item,
                yourPrice,
                lowestCompetitorPrice: intel.lowest_price,
                avgCompetitorPrice: intel.avg_price,
                highestCompetitorPrice: intel.highest_price,
                priceGap,
                priceGapPercent,
                rank,
                buyBoxProbability,
                competitorCount: intel.competitor_count,
                volatility: intel.volatility,
                priceDropAlert: intel.price_drop_alert,
            };
        });
    }, [biData, intelligenceData]);

    // Filter and sort competitor data
    const filteredData = useMemo(() => {
        let filtered = competitorData;

        if (searchQuery) {
            filtered = filtered.filter((item: any) =>
                item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered.sort((a: any, b: any) => {
            if (sortBy === "price") return b.yourPrice - a.yourPrice;
            if (sortBy === "gap") return Math.abs(b.priceGapPercent) - Math.abs(a.priceGapPercent);
            if (sortBy === "rank") return a.rank - b.rank;
            return 0;
        });
    }, [competitorData, searchQuery, sortBy]);

    // Market position stats
    const marketStats = useMemo(() => {
        const total = competitorData.length;
        const rank1 = competitorData.filter((p: any) => p.rank === 1).length;
        const rank2 = competitorData.filter((p: any) => p.rank === 2).length;
        const rank3Plus = total - rank1 - rank2;
        const avgBuyBoxProb = competitorData.reduce((sum: number, p: any) => sum + p.buyBoxProbability, 0) / total;
        const overpriced = competitorData.filter((p: any) => p.priceGapPercent > 5).length;
        const underpriced = competitorData.filter((p: any) => p.priceGapPercent < -5).length;

        return { total, rank1, rank2, rank3Plus, avgBuyBoxProb, overpriced, underpriced };
    }, [competitorData]);

    // Price trend comparison (mock data)
    const priceTrendComparison = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                yourAvg: 1200 + Math.random() * 100,
                competitorAvg: 1150 + Math.random() * 120,
            });
        }
        return data;
    }, []);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
        },
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load competitor data.</AlertDescription>
            </Alert>
        );
    }

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Competitor Analysis</h1>
                    <p className="text-muted-foreground">Market intelligence and competitive positioning</p>
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

            {/* Market Position Stats */}
            <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Best Price Position</CardTitle>
                            <Award className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{marketStats.rank1}</div>
                            <p className="text-xs text-muted-foreground">Products ranked #1</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Buy Box Probability</CardTitle>
                            <Target className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{marketStats.avgBuyBoxProb.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">Chance to win sales</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overpriced Products</CardTitle>
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{marketStats.overpriced}</div>
                            <p className="text-xs text-muted-foreground">&gt;5% above competitors</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Underpriced Products</CardTitle>
                            <TrendingDown className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{marketStats.underpriced}</div>
                            <p className="text-xs text-muted-foreground">&gt;5% below competitors</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Price Trend Comparison */}
            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle>Price Trend Comparison</CardTitle>
                        <CardDescription>Your average price vs. competitor average (Last 30 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceTrendComparison}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                                    <RechartsTooltip
                                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                                    />
                                    <Line type="monotone" dataKey="yourAvg" stroke="#3b82f6" strokeWidth={2} name="Your Avg Price" dot={false} />
                                    <Line type="monotone" dataKey="competitorAvg" stroke="#ef4444" strokeWidth={2} name="Competitor Avg" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Competitor Comparison Table */}
            <motion.div variants={itemVariants}>
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
                            {filteredData.slice(0, 20).map((product: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedSku(product.sku)}
                                >
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
                                            <p className="font-bold text-lg">₹{product.yourPrice.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1">Lowest Competitor</p>
                                            <p className="font-bold text-lg text-red-600">₹{product.lowestCompetitorPrice.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1">Price Gap</p>
                                            <p className={`font-bold text-lg ${product.priceGapPercent > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                {product.priceGapPercent > 0 ? '+' : ''}{product.priceGapPercent.toFixed(1)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1">Competitor Avg</p>
                                            <p className="font-bold text-lg">₹{product.avgCompetitorPrice.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs text-muted-foreground mb-2">Competitor Prices</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {competitors && competitors.length > 0 ? (
                                                competitors.slice(0, 3).map((comp: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <Users className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-muted-foreground">{comp.title} ({comp.marketplace}):</span>
                                                        <span className="font-medium">₹{comp.price ? comp.price.toFixed(2) : 'N/A'}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No competitor data available</span>
                                            )}
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
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
