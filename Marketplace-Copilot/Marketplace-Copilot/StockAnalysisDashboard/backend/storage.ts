import { db, products, sales, uploads, inventory, inventory_master } from './db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type {
  InsertProduct,
  InsertSale,
  InsertUpload,
  Product,
  Sale,
  Upload,
  UpdateProductRequest,
  SalesAnalytics
} from '@shared/schema';

export class PostgresStorage {
  async getProducts(userId: string): Promise<Product[]> {
    const userProducts = await db.select().from(products).where(eq(products.userId, userId));
    const inventoryData = await db.select().from(inventory_master).where(eq(inventory_master.userId, userId));

    // Map inventory by SKU
    const skuToInv = new Map<string, typeof inventoryData[0]>();
    inventoryData.forEach(inv => skuToInv.set(inv.sku, inv));

    // Merge stock data
    return userProducts.map(p => {
      const inv = skuToInv.get(p.sku);
      if (!inv) return p;

      let stock = 0;
      if (p.marketplace === "Amazon") stock = inv.amazon_stock || 0;
      else if (p.marketplace === "Flipkart") stock = inv.flipkart_stock || 0;
      else if (p.marketplace === "Meesho") stock = inv.meesho_stock || 0;

      // Override stock_count with master data
      return { ...p, stock_count: String(stock) };
    });
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const result = await db.insert(sales).values(sale).returning();
    return result[0];
  }

  async getSalesAnalytics(userId: string, marketplace?: string): Promise<SalesAnalytics> {
    const userSales = await db.select().from(sales).where(eq(sales.userId, userId));
    const allProducts = await db.select().from(products).where(eq(products.userId, userId));
    const userProducts = marketplace && marketplace !== "All"
      ? allProducts.filter(p => p.marketplace === marketplace)
      : allProducts;

    // Safety check: if filtering results in no products, return empty stats immediately to avoid skewing
    const productIds = new Set(userProducts.map(p => p.id));

    const inventoryData = await db.select().from(inventory).where(eq(inventory.userId, userId));

    // Create SKU to inventory map
    const skuToInventory = new Map();
    inventoryData.forEach(inv => skuToInventory.set(inv.sku, inv));

    // Filter sales to only include those for the filtered products
    const filteredSales = userSales.filter(s => productIds.has(s.productId));

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalUnits = filteredSales.reduce((acc, curr) => acc + curr.quantity, 0);

    const salesByDateMap = new Map<string, number>();
    userSales.forEach(s => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      salesByDateMap.set(dateStr, (salesByDateMap.get(dateStr) || 0) + Number(s.amount));
    });

    const salesByDate = Array.from(salesByDateMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    const salesByProductMap = new Map<number, { name: string; revenue: number; units: number; costPrice?: number; profit?: number }>();
    userSales.forEach(s => {
      // Only process sales for the filtered products
      if (!productIds.has(s.productId)) return;
      const product = userProducts.find(p => p.id === s.productId);
      if (!product) return;

      const inv = skuToInventory.get(product.sku);
      const costPrice = inv ? Number(inv.cost_price) : 0;
      const saleRevenue = Number(s.amount);
      const saleProfit = saleRevenue - (costPrice * s.quantity);

      const current = salesByProductMap.get(s.productId) || {
        name: product.name,
        revenue: 0,
        units: 0,
        costPrice: costPrice,
        profit: 0
      };
      current.revenue += saleRevenue;
      current.units += s.quantity;
      current.profit = (current.profit || 0) + saleProfit;
      salesByProductMap.set(s.productId, current);
    });

    const salesByProduct = Array.from(salesByProductMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return { totalRevenue, totalUnits, salesByProduct, salesByDate };
  }

  async getUploads(userId: string): Promise<Upload[]> {
    return await db.select().from(uploads).where(eq(uploads.userId, userId)).orderBy(sql`${uploads.createdAt} DESC`);
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const result = await db.insert(uploads).values({ ...upload, error: null }).returning();
    return result[0];
  }

  async updateUploadStatus(id: number, status: string, error?: string): Promise<Upload> {
    const result = await db.update(uploads).set({ status, error: error || null }).where(eq(uploads.id, id)).returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();
