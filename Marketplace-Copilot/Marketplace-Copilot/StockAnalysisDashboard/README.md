# Stock Analysis Dashboard - Component Overview

This folder contains all the essential files required for the Stock Analysis Dashboard system.

## Folder Structure

### 1. `frontend/`
- **`StockAnalysisDashboard.tsx`**: The main React component for the dashboard UI. It renders:
  - **Demand Surge Intelligence**: Upcoming events, trending products, and seasonal patterns.
  - **Replenishment Planning**: 4-week forecasts, budget utilization, and bulk discount recommendations.

### 2. `backend/`
- **`surge.ts`**: The API route (`/api/surge/intelligence`) that bridges the frontend request to the Python engine.
- **`index.ts` & `routes.ts`**: Server setup files to mount the API endpoints.
- **`db.ts`**: Database schema definitions (Drizzle ORM).
- **`storage.ts`**: Data access layer for retrieving product and sales information.

### 3. `engine/`
- **`surge_engine.py`**: The core intelligence script (Python).
  - Performs **STL Decomposition** (Seasonal-Trend decomposition using Loess).
  - Detects recurring historical peaks and anomalies.
  - Calculates confidence scores and surge multipliers.

### 4. `data/`
- Contains CSV fallbacks (e.g., `sales.csv`, `promotions.csv`) used if the database is unreachable.

## Setup Instructions

1. **Frontend**: Import `StockAnalysisDashboard` into your main routing file.
2. **Backend**: Ensure `surge.ts` is registered in your express app (done in `index.ts`).
3. **Engine**:
   - Requires Python 3.x with dependencies: `pandas`, `statsmodels`, `numpy`, `psycopg2`.
   - Install using: `pip install pandas statsmodels numpy psycopg2-binary`.
