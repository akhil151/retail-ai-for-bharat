# Competitor Intelligence System

## Setup

### 1. Install Python Dependencies

```bash
cd python_services
pip install -r requirements.txt
```

### 2. Run Database Migrations

```bash
psql -U postgres -d marketplace -f server/migrations/competitor_intelligence_schema.sql
```

### 3. Configure Environment Variables

Create a `.env` file or set environment variables:

```
DB_HOST=localhost
DB_NAME=marketplace
DB_USER=postgres
DB_PASSWORD=hi
DB_PORT=5432
```

## Usage

### Manual Operations

#### Discover Competitors for a SKU
```bash
python python_services/competitor_discovery.py SKU123
```

#### Track Prices for a SKU
```bash
python python_services/price_tracker.py SKU123
```

#### Get Price Intelligence
```bash
python python_services/price_intelligence.py SKU123
```

### Scheduler

#### Run Continuous Scheduler
```bash
python python_services/scheduler.py --mode run
```

#### One-time Operations
```bash
# Discover all competitors
python python_services/scheduler.py --mode discover

# Track all prices
python python_services/scheduler.py --mode track

# Cleanup old data
python python_services/scheduler.py --mode cleanup
```

## API Endpoints

### Get Price Intelligence
```
GET /api/competitor/intelligence/:sku
GET /api/competitor/intelligence (all SKUs)
```

### Get Recent Price Changes
```
GET /api/competitor/price-changes?hours=1&limit=10
```

### Get Price Alerts
```
GET /api/competitor/alerts
```

### Get Competitors for SKU
```
GET /api/competitor/competitors/:sku
```

### Trigger Discovery
```
POST /api/competitor/discover/:sku
```

### Trigger Tracking
```
POST /api/competitor/track/:sku
```

## Scheduler Configuration

- **Competitor Discovery**: Daily at 2:00 AM
- **Price Tracking**: Every 30 minutes
- **Data Cleanup**: Weekly on Sunday at 3:00 AM

Modify `python_services/config.py` to change these settings.
