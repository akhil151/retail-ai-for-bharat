
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { db, products as productsTable, sales as salesTable, inventory_master, platform_fees } from '../server/db';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:hi@localhost:5432/marketplace"
});

// Helper functions from index.ts
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

async function resetAndSeed() {
    const client = await pool.connect();
    try {
        console.log("🔧 MIGRATING SCHEMA...");
        await client.query(`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS product_name TEXT`);
        await client.query(`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 0`);
        await client.query(`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS amazon_stock INTEGER DEFAULT 0`);
        await client.query(`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS flipkart_stock INTEGER DEFAULT 0`);
        await client.query(`ALTER TABLE inventory_master ADD COLUMN IF NOT EXISTS meesho_stock INTEGER DEFAULT 0`);
        console.log("✅ Schema migrated.");

        console.log("⚠️  TRUNCATING TABLES...");
        await client.query(`TRUNCATE TABLE sales, products, inventory, inventory_master, platform_fees RESTART IDENTITY CASCADE`);
        console.log("✅ Tables truncated.");

        console.log("🌱 SEEDING DATA...");

        // Seeding Logic (Copy-pasted and adapted from server/index.ts with fixes)
        const plats = ["Amazon", "Flipkart", "Meesho"];
        const userId = "harish@gmail.com";

        for (const plat of plats) {
            console.log(`Processing ${plat}...`);
            const prodFile = plat === "Amazon" ? "amazon_products.csv" : plat === "Flipkart" ? "flipkart_products.csv" : "meesho_products.csv";
            const salesFile = plat === "Amazon" ? "amazon_sales.csv" : plat === "Flipkart" ? "flipkart_sales.csv" : "meesho_sales.csv";

            const prodRaw = readCsv(prodFile);
            if (prodRaw) {
                const rows = parseCsv(prodRaw);
                for (const row of rows) {
                    await db.insert(productsTable).values({
                        name: pick(row, ["product_title", "product_name", "name"], "Unnamed"),
                        description: pick(row, ["vertical", "category", "description"], ""),
                        sku: pick(row, ["sku", "fsn"]) || "",
                        // FIX: added extensive price field checks
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
                // Need to refetch products to get IDs
                const prods = (await db.select().from(productsTable)).filter(p => p.marketplace === plat);
                const skuToProductId = new Map<string, number>();
                prods.forEach(p => skuToProductId.set(p.sku, p.id));

                for (const row of rows) {
                    const sku = pick(row, ["sku", "fsn"]);
                    const productId = sku ? skuToProductId.get(sku) : undefined;
                    if (!productId) continue;

                    const quantity = parseInt(pick(row, ["units_sold", "quantity"], "0"), 10);
                    if (!Number.isFinite(quantity) || quantity <= 0) continue;

                    // FIX: Added item_price check
                    const priceNum = parseFloat(pick(row, ["selling_price", "price", "mrp", "item_price", "listing_price"], "0"));
                    const amount = String(pick(row, ["revenue", "amount", "total_amount", "item_price", "total_revenue"], String(priceNum * quantity)));

                    const date = pick(row, ["date", "order_date"]);
                    if (!date) continue;

                    await db.insert(salesTable).values({ productId, quantity, amount, date, userId });
                }
            }
        }

        const invRaw = readCsv("inventory_master.csv");
        if (invRaw) {
            const rows = parseCsv(invRaw);
            console.log(`Processing inventory_master with ${rows.length} rows...`);
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
        if (feesRaw) {
            const rows = parseCsv(feesRaw);
            for (const r of rows) {
                const platform = pick(r, ["platform", "marketplace"]);
                const percent = pick(r, ["percent", "fee_percent", "commission_percent", "rate_percent"], "0");
                const fixed = pick(r, ["fixed", "fixed_fee", "platform_fee_fixed"], "0");
                if (!platform) continue;
                await db.insert(platform_fees).values({ platform, percent, fixed, userId });
            }
        }

        console.log("✅ Seeding completed successfully.");

    } catch (err) {
        console.error("Reset Failed:", err);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

resetAndSeed();
