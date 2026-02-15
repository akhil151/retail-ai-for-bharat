// Helper function to merge real competitor intelligence with product data
export function mergeCompetitorIntelligence(products: any[], intelligenceData: any[] | undefined) {
    return products.map((item: any) => {
        const currentPrice = parseFloat(item.your_price || item.selling_price || item.mrp || 0);
        const costPrice = parseFloat(item.cost_price || 0);

        // Find real competitor intelligence for this SKU
        const intelligence = intelligenceData?.find(intel => intel.sku === item.sku);

        // Use real data if available, otherwise defaults (no random data)
        const lowestCompetitorPrice = intelligence?.lowest_price ?? null;
        const avgCompetitorPrice = intelligence?.avg_price ?? null;
        const highestCompetitorPrice = intelligence?.highest_price ?? null;

        const priceGapPercent = intelligence?.price_gap_percentage ?? 0;
        const competitorCount = intelligence?.competitor_count ?? 0;
        const volatility = intelligence?.volatility ?? 0;
        const priceDropAlert = intelligence?.price_drop_alert ?? false;

        // Calculate optimal price based on rules if competitor data exists
        let optimalPrice = currentPrice;
        let recommendation = "maintain";
        let potentialImpact = 0;

        if (lowestCompetitorPrice) {
            // Rule: Match lowest competitor but keep 5% margin above cost
            const targetPrice = lowestCompetitorPrice;
            const minPrice = costPrice * 1.05;

            if (targetPrice >= minPrice) {
                optimalPrice = targetPrice;
            } else {
                optimalPrice = minPrice;
            }

            if (optimalPrice > currentPrice) recommendation = "increase";
            else if (optimalPrice < currentPrice) recommendation = "decrease";

            potentialImpact = Math.abs(optimalPrice - currentPrice) * (parseInt(item.total_stock) || 10);
        }

        const demandScore = Math.floor(Math.random() * 100); // Keep demand score random for now as it needs sales history
        const elasticity = -1.5; // Default elasticity

        const competitors = intelligence ? [
            { name: "Lowest Price", price: lowestCompetitorPrice },
            { name: "Average Price", price: avgCompetitorPrice },
            { name: "Highest Price", price: highestCompetitorPrice },
        ].filter(c => c.price !== null) : [];

        const priceGap = lowestCompetitorPrice ? currentPrice - lowestCompetitorPrice : 0;

        // Calculate rank if competitor data exists
        let rank = 1; // Default to 1 if no competitors (you are the only one)
        if (lowestCompetitorPrice) {
            if (currentPrice > lowestCompetitorPrice) rank = 2; // Simplified rank
            if (currentPrice > avgCompetitorPrice) rank = 3;
        }

        return {
            ...item,
            currentPrice,
            costPrice,
            competitorPrice: avgCompetitorPrice,
            optimalPrice,
            demandScore,
            elasticity,
            margin: costPrice > 0 ? ((currentPrice - costPrice) / currentPrice * 100).toFixed(1) : 0,
            recommendation,
            potentialImpact,
            competitors,
            lowestCompetitorPrice,
            avgCompetitorPrice,
            highestCompetitorPrice,
            priceGap,
            priceGapPercent,
            rank,
            buyBoxProbability: rank === 1
                ? Math.min(99, 90 + Math.abs(priceGapPercent))
                : Math.max(5, 50 - (priceGapPercent * 2)),
            competitorCount,
            volatility,
            priceDropAlert,
            hasRealData: !!intelligence,
        };
    });
}

// Generate category-based price trend data
export function generateCategoryPriceTrend(products: any[]) {
    const categories = Array.from(new Set(products.map((p: any) => p.vertical || p.category).filter(Boolean)));
    const mainCategory = categories[0] || "All Products";

    const categoryProducts = products.filter((p: any) =>
        (p.vertical === mainCategory || p.category === mainCategory) || categories.length === 0
    );

    const avgYourPrice = categoryProducts.reduce((sum: number, p: any) => sum + p.currentPrice, 0) / categoryProducts.length || 1200;
    const avgCompPrice = categoryProducts.reduce((sum: number, p: any) => sum + p.avgCompetitorPrice, 0) / categoryProducts.length || 1250;
    const avgOptimal = categoryProducts.reduce((sum: number, p: any) => sum + p.optimalPrice, 0) / categoryProducts.length || 1300;

    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            yourPrice: avgYourPrice + (Math.random() * 100 - 50),
            competitorAvg: avgCompPrice + (Math.random() * 75 - 37.5),
            optimal: avgOptimal + (Math.random() * 50 - 25),
        });
    }
    return data;
}
