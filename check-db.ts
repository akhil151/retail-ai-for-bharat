import { db } from "./server/db";
import { products, sales, inventory, userPreferences } from "@db/schema";
import { sql } from "drizzle-orm";

async function checkDatabase() {
  console.log("=== DATABASE CHECK ===\n");

  // Count records
  const productCount = await db.select({ count: sql<number>`count(*)` }).from(products);
  const salesCount = await db.select({ count: sql<number>`count(*)` }).from(sales);
  const inventoryCount = await db.select({ count: sql<number>`count(*)` }).from(inventory);
  const userPrefCount = await db.select({ count: sql<number>`count(*)` }).from(userPreferences);

  console.log("Record Counts:");
  console.log(`- Products: ${productCount[0].count}`);
  console.log(`- Sales: ${salesCount[0].count}`);
  console.log(`- Inventory: ${inventoryCount[0].count}`);
  console.log(`- User Preferences: ${userPrefCount[0].count}\n`);

  // Products by platform
  const productsByPlatform = await db.select({
    platform: products.platform,
    count: sql<number>`count(*)`
  }).from(products).groupBy(products.platform);

  console.log("Products by Platform:");
  productsByPlatform.forEach(p => console.log(`- ${p.platform}: ${p.count}`));

  // Sample products
  console.log("\nSample Products (first 5):");
  const sampleProducts = await db.select().from(products).limit(5);
  console.table(sampleProducts);

  // Sample inventory
  console.log("\nSample Inventory (first 5):");
  const sampleInventory = await db.select().from(inventory).limit(5);
  console.table(sampleInventory);

  process.exit(0);
}

checkDatabase().catch(console.error);
