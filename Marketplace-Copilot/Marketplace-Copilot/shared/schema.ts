import { z } from "zod";

// === SCHEMAS ===

export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  sku: z.string(),
  price: z.string(),
  marketplace: z.string(),
  userId: z.string(),
  fsn: z.string().optional(),
  product_title: z.string().optional(),
  vertical: z.string().optional(),
  sub_category: z.string().optional(),
  brand: z.string().optional(),
  mrp: z.string().optional(),
  selling_price: z.string().optional(),
  stock_count: z.string().optional(),
  listing_status: z.string().optional(),
  procurement_sla: z.string().optional(),
  asin: z.string().optional(),
  category: z.string().optional(),
  listing_price: z.string().optional(),
  your_price: z.string().optional(),
  quantity_available: z.string().optional(),
  condition: z.string().optional(),
  fulfillment_channel: z.string().optional(),
  status: z.string().optional()
});

export const insertSaleSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  amount: z.string(),
  date: z.string(),
  userId: z.string()
});

export const insertUploadSchema = z.object({
  filename: z.string(),
  status: z.string(),
  userId: z.string()
});

// === TYPES ===

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  sku: string;
  price: string;
  marketplace: string;
  userId: string;
  createdAt: Date;
  fsn?: string | null;
  product_title?: string | null;
  vertical?: string | null;
  sub_category?: string | null;
  brand?: string | null;
  mrp?: string | null;
  selling_price?: string | null;
  stock_count?: string | null;
  listing_status?: string | null;
  procurement_sla?: string | null;
  asin?: string | null;
  category?: string | null;
  listing_price?: string | null;
  your_price?: string | null;
  quantity_available?: string | null;
  condition?: string | null;
  fulfillment_channel?: string | null;
  status?: string | null;
}

export type InsertProduct = z.infer<typeof insertProductSchema>;

export interface Sale {
  id: number;
  productId: number;
  quantity: number;
  amount: string;
  date: string;
  userId: string;
  createdAt: Date;
}

export type InsertSale = z.infer<typeof insertSaleSchema>;

export interface Upload {
  id: number;
  filename: string;
  status: string;
  error: string | null;
  userId: string;
  createdAt: Date;
}

export type InsertUpload = z.infer<typeof insertUploadSchema>;

// API Types
export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

// Sales analytics types
export interface SalesAnalytics {
  totalRevenue: number;
  totalUnits: number;
  salesByProduct: { productId: number; name: string; revenue: number; units: number }[];
  salesByDate: { date: string; revenue: number }[];
}
