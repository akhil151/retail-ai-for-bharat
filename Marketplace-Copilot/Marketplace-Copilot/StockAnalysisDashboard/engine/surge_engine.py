import os
import sys
import json
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger("surge_engine")


DEFAULTS = {
    "spike_sigma": 2.0,
    "rolling_window": 14,
    "trend_short": 7,
    "trend_long": 30,
    "seasonal_threshold": 1.25,
    "surge_cap": 3.0,
    "event_lookahead": 90,
    "min_years_for_confidence": 2,
    "event_threshold": 1.25
}


def parse_args() -> Dict[str, Any]:
    args = {
        "user_id": None,
        "lead_time": 14,
        "safety_stock": None,
        "sku": None
    }
    for a in sys.argv[1:]:
        if a.startswith("--user="):
            args["user_id"] = a.split("=", 1)[1]
        elif a.startswith("--lead="):
            args["lead_time"] = int(a.split("=", 1)[1])
        elif a.startswith("--safety="):
            args["safety_stock"] = int(a.split("=", 1)[1])
        elif a.startswith("--sku="):
            args["sku"] = a.split("=", 1)[1]
    return args


def get_conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        return None
    try:
        return psycopg2.connect(dsn, cursor_factory=RealDictCursor)
    except Exception as e:
        logger.warning("DB connection failed: %s", e)
        return None


def project_data_dir() -> str:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "data")


def parse_sales_csv(path: str) -> pd.DataFrame:
    try:
        df = pd.read_csv(path)
    except Exception as e:
        logger.warning("Failed to read %s: %s", path, e)
        return pd.DataFrame(columns=["sku", "date", "units"])
    cols = {c.lower(): c for c in df.columns}
    def pick(*names):
        for n in names:
            if n in cols:
                return cols[n]
        return None
    sku_col = pick("sku", "fsn")
    date_col = pick("date", "order_date")
    units_col = pick("units_sold", "quantity", "units")
    if not (sku_col and date_col and units_col):
        return pd.DataFrame(columns=["sku", "date", "units"])
    out = pd.DataFrame({
        "sku": df[sku_col],
        "date": pd.to_datetime(df[date_col], errors="coerce"),
        "units": pd.to_numeric(df[units_col], errors="coerce")
    })
    out = out.dropna(subset=["sku", "date", "units"])
    out["date"] = out["date"].dt.date
    out["units"] = out["units"].astype(int)
    return out


def load_sales_from_csv(sku_filter: Optional[str]) -> pd.DataFrame:
    ddir = project_data_dir()
    if not os.path.isdir(ddir):
        logger.warning("Data directory not found at %s", ddir)
        return pd.DataFrame(columns=["sku", "date", "units"])
    files = []
    for name in os.listdir(ddir):
        if name.endswith("_sales.csv") or name.endswith("sales.csv"):
            files.append(os.path.join(ddir, name))
    frames = [parse_sales_csv(f) for f in files]
    df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=["sku", "date", "units"])
    if sku_filter:
        df = df[df["sku"] == sku_filter]
    df = df.sort_values(["sku", "date"])
    return df


def fetch_sales(user_id: Optional[str], sku_filter: Optional[str]) -> pd.DataFrame:
    conn = get_conn()
    if conn is None:
        logger.info("No DB connection available. Falling back to CSV sales.")
        return load_sales_from_csv(sku_filter)
    q = """
    SELECT p.sku, s.date::date AS date, s.quantity::int AS units
    FROM sales s
    JOIN products p ON p.id = s.product_id
    WHERE 1=1
    """
    params: List[Any] = []
    if user_id:
        q += " AND s.user_id = %s"
        params.append(user_id)
    if sku_filter:
        q += " AND p.sku = %s"
        params.append(sku_filter)
    q += " ORDER BY p.sku, s.date::date"
    with conn:
        with conn.cursor() as cur:
            cur.execute(q, params)
            rows = cur.fetchall()
    if not rows:
        return pd.DataFrame(columns=["sku", "date", "units"])
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["units"] = pd.to_numeric(df["units"], errors="coerce").fillna(0).astype(int)
    return df


def fetch_promotions(user_id: Optional[str]) -> pd.DataFrame:
    conn = get_conn()
    if conn is None:
        path = os.path.join(project_data_dir(), "promotions.csv")
        if os.path.isfile(path):
            try:
                df = pd.read_csv(path)
                df["start_date"] = pd.to_datetime(df["start_date"]).dt.date
                df["end_date"] = pd.to_datetime(df["end_date"]).dt.date
                return df[["sku", "start_date", "end_date", "discount_pct"]]
            except Exception as e:
                logger.warning("Failed reading promotions.csv: %s", e)
        return pd.DataFrame(columns=["sku", "start_date", "end_date", "discount_pct"])
    try:
        q = """
        SELECT sku, start_date::date AS start_date, end_date::date AS end_date, discount_pct
        FROM promotions
        """
        params: List[Any] = []
        if user_id:
            q += " WHERE user_id = %s"
            params.append(user_id)
        with conn:
            with conn.cursor() as cur:
                cur.execute(q, params)
                rows = cur.fetchall()
        if not rows:
            return pd.DataFrame(columns=["sku", "start_date", "end_date", "discount_pct"])
        df = pd.DataFrame(rows)
        df["start_date"] = pd.to_datetime(df["start_date"]).dt.date
        df["end_date"] = pd.to_datetime(df["end_date"]).dt.date
        return df
    except Exception as e:
        logger.warning("Promotions table not available or query failed: %s", e)
        return pd.DataFrame(columns=["sku", "start_date", "end_date", "discount_pct"])


def date_today(data_dates: pd.Series) -> datetime.date:
    return max(pd.to_datetime(data_dates)).date() if len(data_dates) else datetime.utcnow().date()


from statsmodels.tsa.seasonal import seasonal_decompose

def perform_decomposition(series: pd.Series, period: int = 30) -> Dict[str, Any]:
    """
    Performs time-series decomposition into Trend, Seasonal, and Residual components.
    Uses additive model: Observed = Trend + Seasonal + Residual
    """
    if len(series) < (2 * period):
        return {
            "trend": series, # Fallback to raw data as trend
            "seasonal": pd.Series(0, index=series.index),
            "residual": pd.Series(0, index=series.index),
            "strength": 0.0
        }
        
    try:
        s_filled = series.ffill().bfill()
        
        result = seasonal_decompose(s_filled, model='additive', period=period, extrapolate_trend='freq')
        
        # Calculate seasonality strength
        var_seasonal = result.seasonal.var()
        var_residual = result.resid.var()
        strength = max(0.0, 1.0 - (var_residual / (var_seasonal + var_residual))) if (var_seasonal + var_residual) > 0 else 0.0
        
        return {
            "trend": result.trend,
            "seasonal": result.seasonal,
            "residual": result.resid,
            "strength": float(strength)
        }
    except Exception as e:
        logger.warning(f"Decomposition failed: {e}")
        return {
            "trend": series,
            "seasonal": pd.Series(0, index=series.index),
            "residual": pd.Series(0, index=series.index),
            "strength": 0.0
        }


def detect_recurring_peaks(df: pd.DataFrame, seasonal_component: pd.Series) -> List[Dict[str, Any]]:
    """
    Identifies significant recurring peaks in the seasonal component.
    """
    if seasonal_component.empty or seasonal_component.max() == 0:
        return []
        
    # Threshold for a peak (e.g., top 10% of seasonal values)
    threshold = seasonal_component.quantile(0.90)
    peaks = seasonal_component[seasonal_component > threshold]
    
    events = []
    if peaks.empty:
        return []
    
    # Group consecutive peak days
    sorted_dates = sorted(peaks.index)
    current_peak_group = [sorted_dates[0]]
    
    for i in range(1, len(sorted_dates)):
        d1 = sorted_dates[i-1]
        d2 = sorted_dates[i]
        
        if (d2 - d1).days <= 3: # Allow slight gaps
            current_peak_group.append(d2)
        else:
             # Process group
            max_val = peaks[current_peak_group].max()
            events.append({
                "start_date": current_peak_group[0].strftime("%m-%d"),
                "end_date": current_peak_group[-1].strftime("%m-%d"),
                "magnitude": float(max_val),
                "dates": [d.strftime("%Y-%m-%d") for d in current_peak_group]
            })
            current_peak_group = [sorted_dates[i]]
            
    if current_peak_group:
         max_val = peaks[current_peak_group].max()
         events.append({
            "start_date": current_peak_group[0].strftime("%m-%d"),
            "end_date": current_peak_group[-1].strftime("%m-%d"),
            "magnitude": float(max_val),
            "dates": [d.strftime("%Y-%m-%d") for d in current_peak_group]
        })
        
    return events


def promotion_multiplier_logic(df: pd.DataFrame, promos: pd.DataFrame, sku: str, today: datetime.date) -> Tuple[float, bool]:
    df_promos = promos[promos["sku"] == sku] if not promos.empty else pd.DataFrame(columns=["start_date", "end_date", "discount_pct"])
    if df_promos.empty:
        return 1.0, False
        
    active_promo = False
    max_discount = 0.0
    
    for _, row in df_promos.iterrows():
        if today <= row["end_date"] and (row["start_date"] - today).days <= 14:
            active_promo = True
            max_discount = max(max_discount, row.get("discount_pct", 0))
            
    base_lift = 1.0
    if active_promo:
        base_lift = 1.0 + (max_discount * 0.02)
        
    return (float(base_lift), active_promo)


def classify_surge_type(multipliers: Dict[str, float]) -> str:
    type_map = {
        "seasonal": multipliers["seasonal_index"],
        "festival": multipliers["festival_multiplier"],
        "promo": multipliers["promo_multiplier"],
        "trend": multipliers["trend_multiplier"],
        "spike": multipliers["spike_multiplier"],
    }
    impacts = {k: v for k, v in type_map.items() if v > 1.05}
    if not impacts:
        return "stable"
    return max(impacts, key=impacts.get).replace("_multiplier", "").replace("_index", "")


def compute_for_sku(sku: str, sdf: pd.DataFrame, promos: pd.DataFrame, today: datetime.date, lead_time: int, safety_stock: Optional[int]) -> Dict[str, Any]:
    df = sdf.copy().sort_values("date")
    df = df.groupby("date", as_index=False)["units"].sum()
    daily = df.set_index("date")["units"].asfreq("D").fillna(0)
    units_series = daily # Maintain time index for decomposition

    # 1. STL Decomposition (New)
    decomp = perform_decomposition(units_series, period=30)
    trend_series = decomp["trend"]
    seasonal_series = decomp["seasonal"]
    resid_series = decomp["residual"]
    
    # 2. Historical Pattern Analysis (Enhanced with Seasonal Component)
    recurring_peaks = detect_recurring_peaks(df, seasonal_series)
    
    # Use simpler event detection for specifically identifying date-based events if STL missed short spikes
    # historical_patterns = detect_event_patterns(df) # Legacy method kept for robustness
    
    # Forecast upcoming high-seasonality periods from decomposition
    upcoming_seasonal_spike = False
    seasonal_mult = 1.0
    
    # Simple forecast: Look at seasonal component for the next 30 days (projected from last year)
    # Ideally we'd use the explicit seasonal period, but for now we look at the seasonal value of Today's Month-Day
    # in the decomposition (which repeats). 
    # Since statsmodels seasonal_decompose (naive) repeats the seasonal pattern:
    # We can just look at the seasonal component value for today.
    
    today_dt = pd.Timestamp(today)
    if today_dt in seasonal_series.index:
         current_seasonal_val = seasonal_series.loc[today_dt]
         # Seasonal mult is relative to trend. Additive model: Observed = Trend + Seasonal. 
         # Convert to multiplicative proxy: (Trend + Seasonal) / Trend
         current_trend = trend_series.iloc[-1]
         if current_trend > 0:
             seasonal_mult = (current_trend + current_seasonal_val) / current_trend
    
    # 3. Base Metrics (Updated)
    # Residue-based anomaly detection (more robust than simple rolling mean)
    resid_std = resid_series.std()
    current_resid = resid_series.iloc[-1] if not resid_series.empty else 0
    spike_flag = current_resid > (2 * resid_std) if resid_std > 0 else False
    if spike_flag:
        spike_mult = (trend_series.iloc[-1] + seasonal_series.iloc[-1] + current_resid) / (trend_series.iloc[-1] + seasonal_series.iloc[-1])
        spike_mult = max(1.0, spike_mult)
    else:
        spike_mult = 1.0

    # Trend calculation using decomposed trend
    trend_mult = 1.0
    trend_flag = False
    accel = 0.0
    if len(trend_series) > 30:
        curr_trend = trend_series.iloc[-1]
        prev_trend = trend_series.iloc[-30]
        if prev_trend > 0:
            trend_mult = curr_trend / prev_trend
            trend_flag = trend_mult > 1.1
            accel = (curr_trend - prev_trend) / prev_trend

    promo_mult, promo_flag = promotion_multiplier_logic(df, promos, sku, today)
    
    # 4. Combine
    multipliers = {
        "seasonal_index": float(max(1.0, seasonal_mult)),
        "festival_multiplier": 1.0, # Placeholder, would integrate recurring peaks here
        "promo_multiplier": float(promo_mult),
        "trend_multiplier": float(trend_mult),
        "spike_multiplier": float(spike_mult),
    }

    # Match recurring peaks to upcoming dates for "Festival/Event" forecast
    upcoming_events = []
    check_date = today
    for i in range(DEFAULTS["event_lookahead"]):
        check_md = check_date.strftime("%m-%d")
        for peak in recurring_peaks:
            if check_md == peak["start_date"]:
                # Found a peak starting today/soon
                upcoming_events.append({
                    "event_name": f"Seasonal Peak Pattern ({check_md})",
                    "event_date": check_date.strftime("%Y-%m-%d"),
                    "days_until": i,
                    "expected_multiplier": 1.0 + (peak["magnitude"] / max(1, trend_series.iloc[-1]) ), # Approx multiplier
                    "confidence": decomp["strength"]
                })
        check_date += timedelta(days=1)


    surge_mult = max(1.0, max(multipliers.values()))
    surge_mult = min(DEFAULTS["surge_cap"], surge_mult)
    
    # 5. Forecast
    base_daily = float(trend_series.iloc[-1] if not trend_series.empty and not pd.isna(trend_series.iloc[-1]) else units_series.mean())
    base_forecast = max(0.0, base_daily * lead_time)
    adjusted_forecast = float(base_forecast * surge_mult)
    
    ss = safety_stock if safety_stock is not None else int(round(0.2 * base_daily * lead_time))
    adjusted_reorder = float(adjusted_forecast + ss)

    # 6. Metadata
    reasons = []
    if spike_flag: reasons.append("Anomaly detected (High Residual)")
    if promo_flag: reasons.append("Active or upcoming promotion")
    if trend_flag: reasons.append("Positive trend (Decomposed)")
    if multipliers["seasonal_index"] > 1.1: reasons.append("High seasonal period (STL)")
    if not reasons: reasons.append("Stable demand")

    surge_type = classify_surge_type(multipliers)
    
    return {
        "sku": sku,
        "base_forecast": round(base_forecast, 2),
        "surge_multiplier": round(surge_mult, 3),
        "adjusted_forecast": round(adjusted_forecast, 2),
        "adjusted_reorder": round(adjusted_reorder, 2),
        "signals": {
            "spike_flag": bool(spike_flag),
            "seasonal_flag": multipliers["seasonal_index"] > 1.1,
            "festival_flag": bool(upcoming_events),
            "promo_flag": promo_flag,
            "trend_flag": trend_flag,
        },
        "reasons": reasons,
        "upcoming_events": upcoming_events[:5],
        "metadata": {
            "surge_type": surge_type,
            "surge_confidence_score": round(decomp["strength"], 2),
            "demand_acceleration_rate": round(accel, 4),
            "historical_peak_comparison": 0.0, # Placeholder
        },
        "components": {k: round(v, 3) for k, v in multipliers.items()}
    }


def aggregate_for_dashboard(results: List[Dict[str, Any]], today: datetime.date) -> Dict[str, Any]:
    events = []
    
    # Collect all predicted events from SKU analysis
    for r in results:
        for e in r.get("upcoming_events", []):
            events.append({
                "event": e["event_name"],
                "date": e["event_date"],
                "daysUntil": e["days_until"],
                "multiplier": round(e["expected_multiplier"], 2),
                "sku": r["sku"],
                "confidence": int(e["confidence"] * 100)
            })
            
    # Deduplicate and sort events (prioritize near term, high confidence)
    events.sort(key=lambda x: (x["daysUntil"], -x["confidence"]))
    unique_events = []
    seen = set()
    for e in events:
        key = f"{e['event']}_{e['date']}_{e['sku']}"
        if key not in seen:
            seen.add(key)
            unique_events.append(e)
            
    trending = sorted(results, key=lambda x: x["components"]["trend_multiplier"], reverse=True)[:10]
    trending_products = [{
        "sku": t["sku"],
        "trendMultiplier": t["components"]["trend_multiplier"],
        "surgeMultiplier": t["surge_multiplier"],
        "reasons": t["reasons"]
    } for t in trending]

    return {
        "upcomingEvents": unique_events[:20], # Top 20 relevant events
        "trendingProducts": trending_products
    }


def main():
    try:
        args = parse_args()
        user_id = args["user_id"]
        lead_time = args["lead_time"]
        safety_stock = args["safety_stock"]
        sku_filter = args["sku"]

        sales_df = fetch_sales(user_id, sku_filter)
        if sales_df.empty:
            print(json.dumps({"results": [], "dashboard": {"upcomingEvents": [], "trendingProducts": []}}))
            return

        today = date_today(sales_df["date"])
        
        # Prepare promo data
        promos = fetch_promotions(user_id)

        results: List[Dict[str, Any]] = []
        for sku, g in sales_df.groupby("sku"):
            try:
                res = compute_for_sku(sku, g[["date", "units"]], promos, today, lead_time, safety_stock)
                results.append(res)
            except Exception as e:
                logger.exception("Failed to compute for sku=%s: %s", sku, e)

        dashboard = aggregate_for_dashboard(results, today)
        payload = {
            "results": results,
            "dashboard": dashboard
        }
        print(json.dumps(payload, default=str))
    except Exception as e:
        logger.exception("Fatal error: %s", e)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
