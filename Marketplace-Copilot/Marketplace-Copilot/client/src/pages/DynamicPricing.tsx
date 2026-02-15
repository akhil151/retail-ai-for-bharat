import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Zap, DollarSign, Target, Activity, AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";

export default function DynamicPricing() {
    const [selectedMarketplace, setSelectedMarketplace] = useState("All");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [simulatedPrice, setSimulatedPrice] = useState(0);
    const [autoRepricingEnabled, setAutoRepricingEnabled] = useState(false);
    const { user } = useAuth();
    const { platforms: availablePlatforms } = useFirestorePlatforms();

    // Fetch BI Data
    const { data: biData, isLoading, error } = useQuery({
        queryKey: ["/api/bi/data"],
        queryFn: async () => {
            const res = await fetch("/api/bi/data", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        },
        staleTime: 60000,
    });

    // Enhanced products with pricing intelligence
    const productsWithPricing = useMemo(() => {
        if (!biData?.inventoryMaster) return [];

        return biData.inventoryMaster.map((item: any) => {
            const currentPrice = parseFloat(item.selling_price || item.mrp || 0);
            const costPrice = parseFloat(item.cost_price || 0);
            const competitorPrice = currentPrice * (0.9 + Math.random() * 0.2); // Mock competitor price
            const optimalPrice = currentPrice * (1 + (Math.random() * 0.15 - 0.05)); // Mock optimal price
            const demandScore = Math.floor(Math.random() * 100); // Mock demand score
            const elasticity = (Math.random() * 2 - 1).toFixed(2); // Price elasticity

            return {
                ...item,
                currentPrice,
                costPrice,
                competitorPrice,
                optimalPrice,
                demandScore,
                elasticity: parseFloat(elasticity),
                margin: costPrice > 0 ? ((currentPrice - costPrice) / currentPrice * 100).toFixed(1) : 0,
                recommendation: optimalPrice > currentPrice ? "increase" : "decrease",
                potentialImpact: Math.abs(optimalPrice - currentPrice) * (item.total_stock || 10),
            };
        });
    }, [biData]);

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
        const demandChange = -elasticity * priceChange; // Price elasticity of demand
        const currentSales = 100; // Mock current sales
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
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load pricing data.</AlertDescription>
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
                    <h1 className="text-3xl font-display font-bold text-foreground">Dynamic Pricing</h1>
                    <p className="text-muted-foreground">AI-powered price optimization and repricing automation</p>
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

            {/* Auto-Repricing Toggle */}
            <motion.div variants={itemVariants}>
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
                                <Switch
                                    id="auto-repricing"
                                    checked={autoRepricingEnabled}
                                    onCheckedChange={setAutoRepricingEnabled}
                                />
                                <Label htmlFor="auto-repricing" className="font-medium">
                                    {autoRepricingEnabled ? "Enabled" : "Disabled"}
                                </Label>
                            </div>
                        </div>
                    </CardHeader>
                    <AnimatePresence>
                        {autoRepricingEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CardContent className="space-y-4">
                                    <Alert>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertTitle>Auto-Repricing Active</AlertTitle>
                                        <AlertDescription>
                                            Prices will be adjusted every 6 hours based on competitor pricing and demand signals.
                                        </AlertDescription>
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
            </motion.div>

            {/* Main Content Tabs */}
            <motion.div variants={itemVariants}>
                <Tabs defaultValue="recommendations" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="recommendations">Price Recommendations</TabsTrigger>
                        <TabsTrigger value="simulator">Price Simulator</TabsTrigger>
                        <TabsTrigger value="rules">Repricing Rules</TabsTrigger>
                    </TabsList>

                    {/* Price Recommendations Tab */}
                    <TabsContent value="recommendations" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
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
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
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
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
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
                            </motion.div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Pricing Opportunities</CardTitle>
                                <CardDescription>Products with highest optimization potential</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {productsWithPricing
                                        .sort((a: any, b: any) => b.potentialImpact - a.potentialImpact)
                                        .slice(0, 10)
                                        .map((product: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
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
                                                        <span className="text-muted-foreground">
                                                            Impact: ₹{product.potentialImpact.toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Price Simulator Tab */}
                    <TabsContent value="simulator" className="space-y-6">
                        {!selectedProduct ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">Select a Product</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a product from the recommendations tab to simulate price changes
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
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
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-3 p-4 bg-accent/50 rounded-lg"
                                            >
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
                                            </motion.div>
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
                                                    <RechartsTooltip
                                                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                                                    />
                                                    <Area yAxisId="left" type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#priceGrad)" strokeWidth={2} />
                                                    <Bar yAxisId="right" dataKey="sales" fill="#10b981" opacity={0.6} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* Repricing Rules Tab */}
                    <TabsContent value="rules" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Settings className="h-5 w-5 text-primary" />
                                    <div>
                                        <CardTitle>Repricing Rules</CardTitle>
                                        <CardDescription>Configure automated pricing strategies</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Alert>
                                    <Activity className="h-4 w-4" />
                                    <AlertTitle>Coming Soon</AlertTitle>
                                    <AlertDescription>
                                        Advanced repricing rules and strategies will be available in the next update.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.div>
    );
}
