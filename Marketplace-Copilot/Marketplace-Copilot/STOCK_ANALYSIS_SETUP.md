# Stock Analysis Dashboard - Complete Setup Guide

## Overview
This guide will help you set up and verify the Stock Analysis Dashboard with all features:
- **Inventory Optimization** with 4 charts (Stock vs Predicted Demand, Turnover Ranking, Profit vs Stock, Decision Distribution)
- **Demand Surge Intelligence** with event forecasting and trending products
- **Replenishment Planning** with weekly schedules and cash flow

## Prerequisites
1. PostgreSQL running on localhost:5432
2. Node.js and npm installed
3. (Optional) Groq API key for AI predictions

## Step 1: Database Setup

### 1.1 Reset and Import Data
```bash
# Run the setup script to create database and import all data
npm run setup-db
# or
npx tsx setup-db.ts
```

This will:
- Create the `marketplace` database
- Create all tables (products, sales, inventory_master, etc.)
- Import products from Amazon, Flipkart, and Meesho CSVs
- Import sales data
- Import inventory_master data

### 1.2 Verify Data Import
```bash
# Test the data
npx tsx test-inventory-data.ts
```

Expected output:
```
✓ Products: [count] records
✓ Sales: [count] records
✓ Inventory Master: [count] records
✓ All tests passed!
```

## Step 2: Environment Configuration

### 2.1 Update .env file
```env
DATABASE_URL=postgresql://postgres:hi@localhost:5432/marketplace
SESSION_SECRET=your-secret-key-here

# Optional: For AI-powered predictions
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-70b-versatile
```

**Note:** The system works WITHOUT Groq API key using fallback calculations.

## Step 3: Start the Application

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Start Development Server
```bash
npm run dev
```

The application will start on http://localhost:5000

## Step 4: Access Stock Analysis Dashboard

### 4.1 Login
1. Navigate to http://localhost:5000
2. Login with any email (e.g., demo@example.com)
3. Password: any password (demo mode)

### 4.2 Navigate to Stock Analysis
1. From the landing page, click "Stock Analysis Dashboard"
2. Or directly visit: http://localhost:5000/stock-analysis

## Step 5: Verify Features

### 5.1 Inventory Optimization Tab
Should display:
- ✓ 4 KPI cards (Total Stock Value, Fast Moving SKUs, Slow Moving SKUs, High Risk SKUs)
- ✓ **Stock vs Predicted Demand (30d)** - Bar chart comparing current stock to predicted demand
- ✓ **Turnover Ranking** - Bar chart showing turnover ratios
- ✓ **Profit vs Stock** - Scatter plot showing margin vs stock levels
- ✓ **Decision Distribution** - Pie chart showing INCREASE/MAINTAIN/REDUCE decisions
- ✓ SKU Recommendations table with all products

### 5.2 Demand Surge Intelligence Tab
Should display:
- ✓ Upcoming Events & Forecasts cards (seasonal events, festivals)
- ✓ Trend-Based Stock Alerts (trending products from web trends)

### 5.3 Replenishment Planning Tab
Should display:
- ✓ Budget Overview (3 cards: Monthly Budget, Planned Spending, Remaining Budget)
- ✓ Replenishment Schedule (weekly plan with products)
- ✓ Bulk Opportunities (discount opportunities)
- ✓ Cash Flow Calendar

## Step 6: API Endpoints Reference

### 6.1 Inventory Optimization
```
GET /api/inventory-optimization
```
Returns:
```json
{
  "items": [
    {
      "sku": "SKU001",
      "product_name": "Product Name",
      "current_stock": 100,
      "avg_daily_sales": 5.5,
      "predicted_30d_demand": 165,
      "optimized_stock_level": 180,
      "decision": "INCREASE",
      "turnover_ratio": 1.65,
      "profit_margin": 50,
      "risk_score": 0.15,
      "stock_value": 5000,
      "platform_distribution": {
        "Amazon": 40,
        "Flipkart": 35,
        "Meesho": 25
      }
    }
  ],
  "metrics": {
    "total_stock_value": 500000,
    "accuracy": null,
    "confusion_matrix": null
  },
  "generated_at": "2026-02-15T10:30:00Z"
}
```

### 6.2 Health Check
```
GET /api/inventory-optimization/health
```
Returns system status and data counts.

### 6.3 Demand Surge Intelligence
```
GET /api/surge/intelligence?lead=14
```
Returns upcoming events and seasonal forecasts.

### 6.4 Top 5 Internet Trends
```
GET /api/trends/top5
```
Returns trending products based on web trends.

## Troubleshooting

### Issue: Charts not showing data
**Solution:**
1. Verify data import: `npx tsx test-inventory-data.ts`
2. Check browser console for errors (F12)
3. Verify API response: Open DevTools > Network tab, check `/api/inventory-optimization`

### Issue: "Failed to load inventory optimization data"
**Solution:**
1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Check server logs for errors
4. Restart the dev server

### Issue: Empty inventory_master table
**Solution:**
```bash
# Re-run setup
npm run setup-db
```

### Issue: Groq API errors
**Solution:**
The system works without Groq API. If you see Groq errors:
1. Remove GROQ_API_KEY from .env (uses fallback calculations)
2. Or add a valid Groq API key

## Data Flow Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────┐
│   Backend API   │
│  (Express.js)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│   PostgreSQL    │  │  Groq AI     │
│   Database      │  │  (Optional)  │
│                 │  │              │
│ • products      │  │ • Predictions│
│ • sales         │  │ • Decisions  │
│ • inventory_    │  └──────────────┘
│   master        │
└─────────────────┘
```

## Key Files

### Backend
- `server/routes.ts` - Main API routes including `/api/inventory-optimization`
- `server/db.ts` - Database schema and connection
- `server/services/groq-ai.ts` - AI prediction service
- `setup-db.ts` - Database setup and data import

### Frontend
- `client/src/pages/StockAnalysisDashboard.tsx` - Main dashboard page
- `stockfiles/StockRecommendation.tsx` - Inventory Optimization component with charts

### Data
- `data/amazon_products.csv` - Amazon product catalog
- `data/flipkart_products.csv` - Flipkart product catalog
- `data/meesho_products.csv` - Meesho product catalog
- `data/amazon_sales.csv` - Amazon sales history
- `data/flipkart_sales.csv` - Flipkart sales history
- `data/meesho_sales.csv` - Meesho sales history
- `data/inventory_master.csv` - Inventory master data with stock levels and costs

## Chart Details

### 1. Stock vs Predicted Demand (30d)
- **Type:** Bar Chart
- **Data:** Top 15 SKUs by stock value
- **X-Axis:** SKU
- **Y-Axis:** Quantity
- **Bars:** Current Stock (gray) vs Predicted Demand (green)

### 2. Turnover Ranking
- **Type:** Bar Chart
- **Data:** Top 15 SKUs by turnover ratio
- **X-Axis:** SKU
- **Y-Axis:** Turnover Ratio
- **Color:** Blue

### 3. Profit vs Stock
- **Type:** Scatter Plot
- **Data:** All SKUs
- **X-Axis:** Stock Level
- **Y-Axis:** Profit Margin
- **Color:** By decision type (INCREASE/MAINTAIN/REDUCE)

### 4. Decision Distribution
- **Type:** Pie Chart
- **Data:** Count of SKUs by decision
- **Segments:** INCREASE (green), MAINTAIN (blue), REDUCE (amber)

## Success Criteria

✓ All 4 charts render with data
✓ SKU Recommendations table shows all products
✓ KPI cards display correct metrics
✓ Demand Surge Intelligence shows events
✓ Replenishment Planning shows weekly schedule
✓ No console errors
✓ API endpoints return 200 status

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Verify all prerequisites are met
3. Review server logs for detailed error messages
4. Ensure all CSV files are present in the `data/` directory
