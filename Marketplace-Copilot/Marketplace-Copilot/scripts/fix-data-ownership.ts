
import { db } from "../server/db";
import { products, sales, inventory, inventory_master, platform_fees, uploads, userPreferences } from "../server/db";
import { eq } from "drizzle-orm";

async function fixOwnership() {
    console.log("Starting data ownership fix...");

    try {
        // 1. Find the real user
        const users = await db.select().from(userPreferences);

        if (users.length === 0) {
            console.error("No registered users found! Please sign up in the application first.");
            process.exit(1);
        }

        // Use the first user found (most likely the one the user just created)
        const realUser = users[0];
        const realUserId = realUser.userId;
        console.log(`Found user: ${realUserId}`);
        console.log(`Transferring data from 'demo-user' to '${realUserId}'...`);

        // 2. Update all tables

        // Products
        const productsResult = await db.update(products)
            .set({ userId: realUserId })
            .where(eq(products.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${productsResult.length} products.`);

        // Sales
        const salesResult = await db.update(sales)
            .set({ userId: realUserId })
            .where(eq(sales.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${salesResult.length} sales records.`);

        // Inventory
        const inventoryResult = await db.update(inventory)
            .set({ userId: realUserId })
            .where(eq(inventory.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${inventoryResult.length} inventory records.`);

        // Inventory Master
        const inventoryMasterResult = await db.update(inventory_master)
            .set({ userId: realUserId })
            .where(eq(inventory_master.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${inventoryMasterResult.length} inventory master records.`);

        // Platform Fees
        const feesResult = await db.update(platform_fees)
            .set({ userId: realUserId })
            .where(eq(platform_fees.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${feesResult.length} platform fee records.`);

        // Uploads
        const uploadsResult = await db.update(uploads)
            .set({ userId: realUserId })
            .where(eq(uploads.userId, 'demo-user'))
            .returning();
        console.log(`Updated ${uploadsResult.length} upload records.`);

        console.log("\n✓ Data ownership transfer complete!");
        process.exit(0);

    } catch (error) {
        console.error("Error fixing data ownership:", error);
        process.exit(1);
    }
}

fixOwnership();
