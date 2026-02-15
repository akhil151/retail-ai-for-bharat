
import { db } from "../server/db";
import { products, inventory_master, userPreferences } from "../server/db";
import { eq } from "drizzle-orm";

async function debugPrices() {
    console.log("Debugging prices...");

    try {
        const users = await db.select().from(userPreferences);
        if (users.length === 0) {
            console.log("No users found.");
            return;
        }
        const userId = users[0].userId;
        console.log(`Checking data for user: ${userId}`);

        const userProducts = await db.select().from(products).where(eq(products.userId, userId));
        console.log(`Found ${userProducts.length} products.`);

        if (userProducts.length > 0) {
            console.log("Sample Product Prices:");
            userProducts.slice(0, 5).forEach(p => {
                console.log(`SKU: ${p.sku}, Name: ${p.name}, Price: ${p.price}, Selling Price: ${p.selling_price}, MRP: ${p.mrp}`);
            });
        }

        const inventory = await db.select().from(inventory_master).where(eq(inventory_master.userId, userId));
        console.log(`Found ${inventory.length} inventory records.`);

        if (inventory.length > 0) {
            console.log("Sample Inventory Records:");
            inventory.slice(0, 5).forEach(i => {
                console.log(`SKU: ${i.sku}, Product: ${i.product_name}`);
            });
        }

        // check for mismatches
        console.log("\nChecking for SKU matches between products and inventory:");
        let matched = 0;
        inventory.forEach(inv => {
            const product = userProducts.find(p => p.sku === inv.sku);
            if (product) {
                matched++;
            } else {
                // console.log(`No product found for inventory SKU: ${inv.sku}`);
            }
        });
        console.log(`Matched ${matched} / ${inventory.length} inventory items to products.`);

    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}

debugPrices();
