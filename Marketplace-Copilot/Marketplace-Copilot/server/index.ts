import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { db, products as productsTable, sales as salesTable, inventory_master, platform_fees, pool } from "./db";
import pg from "pg";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  async function runMigrations() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres:hi@localhost:5432/marketplace"
    });
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const sql = readFileSync(join(process.cwd(), "migrations", "init.sql"), "utf-8");
    await pool.query(sql);
    await pool.end();
  }
  await runMigrations();
  async function seedFromDataIfEmpty() {
    const invCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM inventory_master');
    const invCount = invCountRes.rows[0]?.count ?? 0;
    const feeCount = (await db.select().from(platform_fees)).length;
    const fs = await import("fs");
    const path = await import("path");
    const readCsv = (fname: string) => {
      const filePath = path.join(process.cwd(), "data", fname);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, "utf-8");
    };
    const parseCsv = (csv: string) => {
      const lines = csv.trim().split("\n");
      const headers = lines[0].split(",");
      return lines.slice(1).map(line => {
        const values = line.split(",");
        const row: any = {};
        headers.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
        return row;
      });
    };
    const pick = (obj: any, keys: string[], def?: string) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
      }
      return def ?? "";
    };
    const plats = ["Amazon", "Flipkart", "Meesho"];
    const userId = "harish@gmail.com";
    for (const plat of plats) {
      const existingProducts = await db.select().from(productsTable);
      const hasPlatProducts = existingProducts.some(p => p.marketplace === plat);
      const prodFile = plat === "Amazon" ? "amazon_products.csv" : plat === "Flipkart" ? "flipkart_products.csv" : "meesho_products.csv";
      const salesFile = plat === "Amazon" ? "amazon_sales.csv" : plat === "Flipkart" ? "flipkart_sales.csv" : "meesho_sales.csv";
      const prodRaw = readCsv(prodFile);
      if (prodRaw && !hasPlatProducts) {
        const rows = parseCsv(prodRaw);
        for (const row of rows) {
          await db.insert(productsTable).values({
            name: pick(row, ["product_title", "product_name", "name"], "Unnamed"),
            description: pick(row, ["vertical", "category", "description"], ""),
            sku: pick(row, ["sku", "fsn"]) || "",
            price: pick(row, ["selling_price", "price", "base_price", "mrp", "listing_price", "your_price"], "0"),
            marketplace: plat,
            userId,
            fsn: pick(row, ["fsn"]) || null,
            product_title: pick(row, ["product_title", "name"]) || null,
            vertical: pick(row, ["vertical"]) || null,
            sub_category: pick(row, ["sub_category", "subcategory"]) || null,
            brand: pick(row, ["brand"]) || null,
            mrp: pick(row, ["mrp"]) || null,
            selling_price: pick(row, ["selling_price", "your_price"]) || null,
            stock_count: pick(row, ["stock_count", "stock", "quantity_available"]) || null,
            listing_status: pick(row, ["listing_status", "status"]) || null,
            procurement_sla: pick(row, ["procurement_sla", "sla"]) || null,
            asin: pick(row, ["asin"]) || null,
            category: pick(row, ["category"]) || null,
            listing_price: pick(row, ["listing_price"]) || null,
            your_price: pick(row, ["your_price", "selling_price"]) || null,
            quantity_available: pick(row, ["quantity_available", "stock"]) || null,
            condition: pick(row, ["condition"]) || null,
            fulfillment_channel: pick(row, ["fulfillment_channel"]) || null,
            status: pick(row, ["status"]) || null,
          });
        }
      }
      const salesRaw = readCsv(salesFile);
      if (salesRaw) {
        const rows = parseCsv(salesRaw);
        const prods = (await db.select().from(productsTable)).filter(p => p.marketplace === plat);
        const skuToProductId = new Map<string, number>();
        prods.forEach(p => skuToProductId.set(p.sku, p.id));
        const existingSalesForPlat = (await db.select().from(salesTable)).filter(s => {
          const pid = s.productId;
          return prods.some(p => p.id === pid);
        }).length > 0;
        if (existingSalesForPlat) {
          continue;
        }
        for (const row of rows) {
          const sku = pick(row, ["sku", "fsn"]);
          const productId = sku ? skuToProductId.get(sku) : undefined;
          if (!productId) continue;
          const quantity = parseInt(pick(row, ["units_sold", "quantity"], "0"), 10);
          if (!Number.isFinite(quantity) || quantity <= 0) continue;
          const priceNum = parseFloat(pick(row, ["selling_price", "price", "mrp", "item_price", "listing_price"], "0"));
          const amount = String(pick(row, ["revenue", "amount", "total_amount", "item_price", "total_revenue"], String(priceNum * quantity)));
          const date = pick(row, ["date", "order_date"]);
          if (!date) continue;
          await db.insert(salesTable).values({ productId, quantity, amount, date, userId });
        }
      }
    }
    // Verify Schema first
    try {
      // We use a separate connection or just try-catch these in the pool??
      // Since this is inside seedFromDataIfEmpty which is called after migrations (init.sql)
      // We can just run these queries.
      // But we need a client. seedFromDataIfEmpty uses 'db' (drizzle) mostly, except we can't run raw queries easily with drizzle object sometimes depending on setup.
      // Actually we can use sql template tag from drizzle or just use the pool if we had access.
      // Here we don't have direct access to pool easily unless we create one or expose it.
      // However, we can use db.execute(sql`...`)
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS product_name TEXT`);
      await db.execute(sql`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 0`);
      await db.execute(sql`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS amazon_stock INTEGER DEFAULT 0`);
      await db.execute(sql`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS flipkart_stock INTEGER DEFAULT 0`);
      await db.execute(sql`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS meesho_stock INTEGER DEFAULT 0`);
    } catch (e) {
      console.error("Schema migration aid failed (might already exist):", e);
    }

    const invRaw = readCsv("inventory_master.csv");
    if (invRaw && invCount === 0) {
      const rows = parseCsv(invRaw);
      for (const r of rows) {
        const sku = pick(r, ["sku"]);
        const product_name = pick(r, ["product_name"]);
        const cost_price = pick(r, ["cost_price"], "0");
        const total_stock = parseInt(pick(r, ["total_stock"], "0"), 10);
        const amazon_stock = parseInt(pick(r, ["amazon_stock"], "0"), 10);
        const flipkart_stock = parseInt(pick(r, ["flipkart_stock"], "0"), 10);
        const meesho_stock = parseInt(pick(r, ["meesho_stock"], "0"), 10);

        if (!sku) continue;
        await db.insert(inventory_master).values({
          sku,
          product_name,
          cost_price,
          total_stock,
          amazon_stock,
          flipkart_stock,
          meesho_stock,
          userId
        });
      }
    }
    const feesRaw = readCsv("platform_fees.csv");
    if (feesRaw && feeCount === 0) {
      const rows = parseCsv(feesRaw);
      for (const r of rows) {
        const platform = pick(r, ["platform", "marketplace"]);
        const percent = pick(r, ["percent", "fee_percent", "commission_percent", "rate_percent"], "0");
        const fixed = pick(r, ["fixed", "fixed_fee", "platform_fee_fixed"], "0");
        if (!platform) continue;
        await db.insert(platform_fees).values({ platform, percent, fixed, userId });
      }
    }
  }
  try {
    await seedFromDataIfEmpty();
  } catch (e) {
    console.error("Seed step failed, continuing to start server:", e);
  }

  // Register competitor intelligence routes
  const competitorRoutes = (await import("./routes/competitor")).default;
  app.use("/api/competitor", competitorRoutes);

  // Register surge intelligence routes
  const surgeRoutes = (await import("./routes/surge")).default;
  app.use("/api/surge", surgeRoutes);

  await registerRoutes(httpServer, app);


  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 3000 if not specified.
  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(
    {
      port,
      host: "127.0.0.1",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

