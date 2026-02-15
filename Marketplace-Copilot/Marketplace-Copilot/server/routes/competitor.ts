import express from "express";
import { pool } from "../db";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = express.Router();


// Get price intelligence for a SKU
router.get("/intelligence/:sku", async (req, res) => {
    try {
        const { sku } = req.params;

        const result = await pool.query(
            "SELECT * FROM get_price_intelligence($1)",
            [sku]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No intelligence data found" });
        }

        const data = result.rows[0];

        res.json({
            sku: data.sku,
            your_price: parseFloat(data.your_price) || 0,
            lowest_price: data.lowest_price ? parseFloat(data.lowest_price) : null,
            avg_price: data.avg_price ? parseFloat(data.avg_price) : null,
            highest_price: data.highest_price ? parseFloat(data.highest_price) : null,
            price_gap_percentage: parseFloat(data.price_gap_percent) || 0,
            volatility: parseFloat(data.volatility) || 0,
            competitor_count: parseInt(data.competitor_count) || 0,
            price_drop_alert: data.price_drop_alert || false
        });
    } catch (error) {
        console.error("Error fetching price intelligence:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get bulk price intelligence
router.get("/intelligence", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT DISTINCT sku FROM competitor_mapping WHERE is_active = TRUE
    `);

        const skus = result.rows.map((row: any) => row.sku);
        const intelligence = [];

        for (const sku of skus) {
            const data = await pool.query(
                "SELECT * FROM get_price_intelligence($1)",
                [sku]
            );

            if (data.rows.length > 0) {
                const row = data.rows[0];
                intelligence.push({
                    sku: row.sku,
                    your_price: parseFloat(row.your_price) || 0,
                    lowest_price: row.lowest_price ? parseFloat(row.lowest_price) : null,
                    avg_price: row.avg_price ? parseFloat(row.avg_price) : null,
                    highest_price: row.highest_price ? parseFloat(row.highest_price) : null,
                    price_gap_percentage: parseFloat(row.price_gap_percent) || 0,
                    volatility: parseFloat(row.volatility) || 0,
                    competitor_count: parseInt(row.competitor_count) || 0,
                    price_drop_alert: row.price_drop_alert || false
                });
            }
        }

        res.json(intelligence);
    } catch (error) {
        console.error("Error fetching bulk intelligence:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get recent price changes
router.get("/price-changes", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await pool.query(`
      WITH recent_prices AS (
        SELECT
          cm.sku,
          cm.competitor_asin,
          cm.competitor_title,
          cm.marketplace,
          cph.price as current_price,
          cph.scraped_at,
          LAG(cph.price) OVER (
            PARTITION BY cm.id
            ORDER BY cph.scraped_at
          ) as previous_price,
          LAG(cph.scraped_at) OVER (
            PARTITION BY cm.id
            ORDER BY cph.scraped_at
          ) as previous_scraped_at
        FROM competitor_mapping cm
        JOIN competitor_price_history cph ON cm.id = cph.competitor_mapping_id
        WHERE cph.scraped_at >= NOW() - INTERVAL '${hours} hours'
          AND cm.is_active = TRUE
      ),
      price_changes AS (
        SELECT
          sku,
          competitor_asin,
          competitor_title,
          marketplace,
          current_price,
          previous_price,
          scraped_at,
          previous_scraped_at,
          ((current_price - previous_price) / previous_price * 100) as price_change_percent,
          EXTRACT(EPOCH FROM (scraped_at - previous_scraped_at)) / 60 as minutes_ago
        FROM recent_prices
        WHERE previous_price IS NOT NULL
          AND ABS((current_price - previous_price) / previous_price) > 0.01
      )
      SELECT
        sku,
        competitor_asin,
        competitor_title,
        marketplace,
        current_price,
        previous_price,
        price_change_percent,
        minutes_ago
      FROM price_changes
      ORDER BY ABS(price_change_percent) DESC
      LIMIT $1
    `, [limit]);

        res.json(result.rows.map((row: any) => ({
            sku: row.sku,
            competitor_asin: row.competitor_asin,
            competitor_title: row.competitor_title,
            marketplace: row.marketplace,
            current_price: parseFloat(row.current_price),
            previous_price: parseFloat(row.previous_price),
            price_change_percent: parseFloat(row.price_change_percent),
            minutes_ago: parseFloat(row.minutes_ago)
        })));
    } catch (error) {
        console.error("Error fetching price changes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get price alerts
router.get("/alerts", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT DISTINCT sku FROM competitor_mapping WHERE is_active = TRUE
    `);

        const skus = result.rows.map((row: any) => row.sku);
        const alerts = {
            overpriced: [] as string[],
            best_price: [] as string[],
            price_drops: [] as string[],
            high_volatility: [] as string[]
        };

        for (const sku of skus) {
            const data = await pool.query(
                "SELECT * FROM get_price_intelligence($1)",
                [sku]
            );

            if (data.rows.length > 0) {
                const row = data.rows[0];
                const priceGap = parseFloat(row.price_gap_percent) || 0;
                const volatility = parseFloat(row.volatility) || 0;

                if (priceGap > 10) alerts.overpriced.push(sku);
                if (priceGap <= 2 && priceGap >= -2) alerts.best_price.push(sku);
                if (row.price_drop_alert) alerts.price_drops.push(sku);
                if (volatility > 50) alerts.high_volatility.push(sku);
            }
        }

        res.json(alerts);
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get competitor details for a SKU
router.get("/competitors/:sku", async (req, res) => {
    try {
        const { sku } = req.params;

        const result = await pool.query(`
      SELECT
        cm.id,
        cm.competitor_asin,
        cm.competitor_title,
        cm.competitor_brand,
        cm.marketplace,
        cm.similarity_score,
        cm.rank_position,
        lcp.price,
        lcp.availability,
        lcp.seller_rating,
        lcp.scraped_at
      FROM competitor_mapping cm
      LEFT JOIN latest_competitor_prices lcp ON cm.id = lcp.mapping_id
      WHERE cm.sku = $1 AND cm.is_active = TRUE
      ORDER BY cm.rank_position
    `, [sku]);

        res.json(result.rows.map((row: any) => ({
            id: row.id,
            asin: row.competitor_asin,
            title: row.competitor_title,
            brand: row.competitor_brand,
            marketplace: row.marketplace,
            similarity_score: parseFloat(row.similarity_score),
            rank: row.rank_position,
            price: row.price ? parseFloat(row.price) : null,
            availability: row.availability,
            seller_rating: row.seller_rating ? parseFloat(row.seller_rating) : null,
            last_updated: row.scraped_at
        })));
    } catch (error) {
        console.error("Error fetching competitors:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Trigger competitor discovery for a SKU
router.post("/discover/:sku", async (req, res) => {
    try {
        const { sku } = req.params;

        // Execute Python script
        const { stdout, stderr } = await execAsync(
            `python python_services/competitor_discovery.py ${sku}`,
            { cwd: process.cwd() }
        );

        if (stderr) {
            console.error("Discovery stderr:", stderr);
        }

        res.json({ success: true, message: stdout });
    } catch (error) {
        console.error("Error triggering discovery:", error);
        res.status(500).json({ error: "Failed to discover competitors" });
    }
});

// Trigger price tracking for a SKU
router.post("/track/:sku", async (req, res) => {
    try {
        const { sku } = req.params;

        // Execute Python script
        const { stdout, stderr } = await execAsync(
            `python python_services/price_tracker.py ${sku}`,
            { cwd: process.cwd() }
        );

        if (stderr) {
            console.error("Tracking stderr:", stderr);
        }

        res.json({ success: true, message: stdout });
    } catch (error) {
        console.error("Error triggering tracking:", error);
        res.status(500).json({ error: "Failed to track prices" });
    }
});

export default router;
