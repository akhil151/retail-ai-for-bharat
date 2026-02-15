# 🚀 Stock vs Predicted Demand Chart - Quick Fix Guide

## Problem
The "Stock vs Predicted Demand (30d)" chart is not showing data.

## Solution Steps

### Step 1: Verify Database Setup
```bash
npm run setup-db
```
Expected output:
- ✓ Imported 90 products
- ✓ Imported 152187 sales records  
- ✓ Imported 30 inventory master records

### Step 2: Verify Data
```bash
npm run test-data
```
Should show:
- ✓ Products: 90 records
- ✓ Sales: 152187 records
- ✓ Inventory Master: 30 records
- Sample metrics with predicted demand

### Step 3: Start the Server
```bash
npm run dev
```
Server should start on http://localhost:5000

### Step 4: Test the Debug Page
1. Login at http://localhost:5000
2. Visit http://localhost:5000/debug-inventory
3. You should see:
   - Total Items count
   - Sample item JSON
   - Table with Stock vs Demand data

### Step 5: Check Stock Analysis Dashboard
1. Visit http://localhost:5000/stock-analysis
2. Click on "Inventory Optimization" tab
3. Open browser console (F12)
4. Look for logs:
   ```
   Inventory Optimization Response: {...}
   Items count: 30
   Sample item: {...}
   Chart data - stockVsDemand: 15
   Chart data - turnoverRanking: 15
   ```

### Step 6: Verify Chart Rendering
The chart should now display with:
- X-axis: SKU names (SKU001, SKU002, etc.)
- Y-axis: Quantities
- Gray bars: Current Stock
- Green bars: Predicted Demand (30d)

## Troubleshooting

### Issue: "No data available" in chart
**Check:**
1. Browser console for errors
2. Network tab - /api/inventory-optimization should return 200
3. Response should have `items` array with data

**Fix:**
```bash
# Re-run database setup
npm run setup-db

# Restart server
npm run dev
```

### Issue: Chart shows but no bars
**Check:**
1. Console logs show `Chart data - stockVsDemand: 0`
2. Items array is empty

**Fix:**
- Verify you're logged in
- Check that user_id matches ('demo-user')
- Re-import data

### Issue: API returns 401 Unauthorized
**Fix:**
1. Logout and login again
2. Clear browser cookies
3. Restart server

### Issue: TypeScript errors
**Fix:**
```bash
npm run check
```
Should show 0 errors. If not, all fixes are already applied.

## What Was Fixed

1. **Chart Data Processing:**
   - Added null checks for empty data
   - Fixed sorting by current_stock instead of stock_value
   - Truncated SKU names for better display
   - Added fallback values (|| 0)

2. **Chart Layout:**
   - Increased bottom margin for X-axis labels
   - Rotated labels -45 degrees
   - Reduced font size to 11px
   - Added empty state UI

3. **Debug Tools:**
   - Added console logging
   - Created debug page at /debug-inventory
   - Added data verification script

4. **API Response:**
   - Verified endpoint returns correct data structure
   - Confirmed 30 items with proper fields

## Expected Data Structure

Each item should have:
```json
{
  "sku": "SKU001",
  "product_name": "Samsung Galaxy M34 5G",
  "current_stock": 521,
  "avg_daily_sales": 141.20,
  "predicted_30d_demand": 4236,
  "optimized_stock_level": 4236,
  "decision": "INCREASE",
  "turnover_ratio": 8.13,
  "profit_margin": 1500,
  "risk_score": 0.88,
  "stock_value": 7033500
}
```

## Chart Configuration

```typescript
<BarChart data={stockVsDemand}>
  <XAxis 
    dataKey="sku" 
    angle={-45} 
    height={80} 
    textAnchor="end" 
  />
  <Bar dataKey="stock" fill="#94a3b8" name="Current Stock" />
  <Bar dataKey="demand" fill="#22c55e" name="Predicted Demand" />
</BarChart>
```

## Success Criteria

✅ Chart displays 15 bars (top 15 SKUs)
✅ Each SKU shows 2 bars (stock + demand)
✅ X-axis labels are readable
✅ Tooltip shows values on hover
✅ Legend shows "Current Stock" and "Predicted Demand"
✅ No console errors

## Quick Commands

```bash
# Full reset and start
npm run setup-db && npm run dev

# Just verify data
npm run test-data

# Check TypeScript
npm run check

# View debug page
# http://localhost:5000/debug-inventory
```

## Support

If chart still doesn't show:
1. Check browser console (F12) for errors
2. Visit /debug-inventory to see raw data
3. Verify API response in Network tab
4. Ensure PostgreSQL is running
5. Confirm DATABASE_URL in .env is correct

---

**Status:** ✅ All fixes applied
**Next:** Run `npm run dev` and visit http://localhost:5000/stock-analysis
