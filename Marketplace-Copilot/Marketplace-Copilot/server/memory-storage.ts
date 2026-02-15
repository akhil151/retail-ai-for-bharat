import type {
  InsertProduct,
  InsertSale,
  InsertUpload,
  Product,
  Sale,
  Upload,
  UpdateProductRequest,
  SalesAnalytics
} from "@shared/schema";

export class MemoryStorage {
  private products: Product[] = [];
  private sales: Sale[] = [];
  private uploads: Upload[] = [];
  private nextProductId = 1;
  private nextSaleId = 1;
  private nextUploadId = 1;
  private userPlatforms: Map<string, string[]> = new Map();

  async getProducts(userId: string): Promise<Product[]> {
    return this.products.filter(p => p.userId === userId);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.find(p => p.id === id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: this.nextProductId++,
      createdAt: new Date()
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');
    this.products[index] = { ...this.products[index], ...updates };
    return this.products[index];
  }

  async deleteProduct(id: number): Promise<void> {
    this.products = this.products.filter(p => p.id !== id);
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const newSale: Sale = {
      ...sale,
      id: this.nextSaleId++,
      createdAt: new Date()
    };
    this.sales.push(newSale);
    return newSale;
  }

  async getSalesAnalytics(userId: string, platforms?: string[]): Promise<SalesAnalytics> {
    const userSales = this.sales.filter(s => {
      if (s.userId !== userId) return false;
      if (!platforms || platforms.length === 0) return true;
      const product = this.products.find(p => p.id === s.productId);
      return product ? platforms.includes(product.marketplace) : false;
    });
    const totalRevenue = userSales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalUnits = userSales.reduce((acc, curr) => acc + curr.quantity, 0);

    const salesByDateMap = new Map<string, number>();
    userSales.forEach(s => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      salesByDateMap.set(dateStr, (salesByDateMap.get(dateStr) || 0) + Number(s.amount));
    });

    const salesByDate = Array.from(salesByDateMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    const salesByProductMap = new Map<number, { name: string; revenue: number; units: number }>();
    userSales.forEach(s => {
      const product = this.products.find(p => p.id === s.productId);
      if (!product) return;
      const current = salesByProductMap.get(s.productId) || { name: product.name, revenue: 0, units: 0 };
      current.revenue += Number(s.amount);
      current.units += s.quantity;
      salesByProductMap.set(s.productId, current);
    });

    const salesByProduct = Array.from(salesByProductMap.entries()).map(([productId, data]) => ({ productId, ...data }));

    return { totalRevenue, totalUnits, salesByProduct, salesByDate };
  }

  async getUploads(userId: string): Promise<Upload[]> {
    return this.uploads.filter(u => u.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const newUpload: Upload = {
      ...upload,
      id: this.nextUploadId++,
      createdAt: new Date(),
      error: null
    };
    this.uploads.push(newUpload);
    return newUpload;
  }

  async updateUploadStatus(id: number, status: string, error?: string): Promise<Upload> {
    const upload = this.uploads.find(u => u.id === id);
    if (!upload) throw new Error('Upload not found');
    upload.status = status;
    if (error) upload.error = error;
    return upload;
  }

  async setUserPlatforms(userId: string, platforms: string[]) {
    this.userPlatforms.set(userId, platforms);
  }

  async getUserPlatforms(userId: string): Promise<string[] | undefined> {
    return this.userPlatforms.get(userId);
  }
}

export const storage = new MemoryStorage();
