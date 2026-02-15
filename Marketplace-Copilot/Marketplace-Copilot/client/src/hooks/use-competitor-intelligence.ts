import { useQuery } from "@tanstack/react-query";

// Price Intelligence Types
export interface PriceIntelligence {
    sku: string;
    your_price: number;
    lowest_price: number | null;
    avg_price: number | null;
    highest_price: number | null;
    price_gap_percentage: number;
    volatility: number;
    competitor_count: number;
    price_drop_alert: boolean;
}

export interface PriceChange {
    sku: string;
    competitor_asin: string;
    competitor_title: string;
    marketplace: string;
    current_price: number;
    previous_price: number;
    price_change_percent: number;
    minutes_ago: number;
}

export interface PriceAlerts {
    overpriced: string[];
    best_price: string[];
    price_drops: string[];
    high_volatility: string[];
}

export interface Competitor {
    id: number;
    asin: string;
    title: string;
    brand: string | null;
    marketplace: string;
    similarity_score: number;
    rank: number;
    price: number | null;
    availability: string;
    seller_rating: number | null;
    last_updated: string;
}

// Get price intelligence for a specific SKU
export function usePriceIntelligence(sku: string | null) {
    return useQuery<PriceIntelligence>({
        queryKey: ["/api/competitor/intelligence", sku],
        queryFn: async () => {
            if (!sku) throw new Error("SKU is required");
            const response = await fetch(`/api/competitor/intelligence/${sku}`);
            if (!response.ok) throw new Error("Failed to fetch price intelligence");
            return response.json();
        },
        enabled: !!sku,
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

// Get bulk price intelligence for all products
export function useBulkPriceIntelligence() {
    return useQuery<PriceIntelligence[]>({
        queryKey: ["/api/competitor/intelligence"],
        queryFn: async () => {
            const response = await fetch("/api/competitor/intelligence");
            if (!response.ok) throw new Error("Failed to fetch bulk intelligence");
            return response.json();
        },
        refetchInterval: 60000, // Refresh every minute
    });
}

// Get recent price changes
export function useRecentPriceChanges(hours: number = 1, limit: number = 10) {
    return useQuery<PriceChange[]>({
        queryKey: ["/api/competitor/price-changes", hours, limit],
        queryFn: async () => {
            const response = await fetch(
                `/api/competitor/price-changes?hours=${hours}&limit=${limit}`
            );
            if (!response.ok) throw new Error("Failed to fetch price changes");
            return response.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
    });
}

// Get price alerts
export function usePriceAlerts() {
    return useQuery<PriceAlerts>({
        queryKey: ["/api/competitor/alerts"],
        queryFn: async () => {
            const response = await fetch("/api/competitor/alerts");
            if (!response.ok) throw new Error("Failed to fetch alerts");
            return response.json();
        },
        refetchInterval: 60000, // Refresh every minute
    });
}

// Get competitors for a specific SKU
export function useCompetitors(sku: string | null) {
    return useQuery<Competitor[]>({
        queryKey: ["/api/competitor/competitors", sku],
        queryFn: async () => {
            if (!sku) throw new Error("SKU is required");
            const response = await fetch(`/api/competitor/competitors/${sku}`);
            if (!response.ok) throw new Error("Failed to fetch competitors");
            return response.json();
        },
        enabled: !!sku,
        refetchInterval: 60000, // Refresh every minute
    });
}

// Trigger competitor discovery for a SKU
export async function discoverCompetitors(sku: string): Promise<void> {
    const response = await fetch(`/api/competitor/discover/${sku}`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to trigger discovery");
}

// Trigger price tracking for a SKU
export async function trackPrices(sku: string): Promise<void> {
    const response = await fetch(`/api/competitor/track/${sku}`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to trigger tracking");
}
