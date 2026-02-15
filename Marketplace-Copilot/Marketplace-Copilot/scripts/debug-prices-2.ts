
import { db } from "../server/db";
import { products, inventory_master } from "../server/db";
import { eq } from "drizzle-orm";

async function debugPrices2() {
    const allProducts = await db.select().from(products).limit(1);
    console.log("Single Product Dump:");
    console.log(JSON.stringify(allProducts[0], null, 2));

    const allInventory = await db.select().from(inventory_master).limit(1);
    console.log("Single Inventory Dump:");
    console.log(JSON.stringify(allInventory[0], null, 2));
    process.exit(0);
}

debugPrices2();
