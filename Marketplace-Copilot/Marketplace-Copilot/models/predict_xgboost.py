import pandas as pd
import numpy as np
import joblib
import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALES_PATH = os.path.join(BASE_DIR, "data", "sales.csv")
PRODUCTS_PATH = os.path.join(BASE_DIR, "data", "products.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "demand_model.pkl")

df = pd.read_csv(SALES_PATH)
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(["sku", "date"])

products = pd.read_csv(PRODUCTS_PATH)
name_map = {row["sku"]: row["product_name"] for _, row in products.iterrows()}

df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["weekend"] = (df["day_of_week"] >= 5).astype(int)
df["lag_1"] = df.groupby("sku")["units_sold"].shift(1)
df["lag_7"] = df.groupby("sku")["units_sold"].shift(7)
df["roll_mean_7"] = df.groupby("sku")["units_sold"].shift(1).rolling(7).mean()
df = df.dropna()

features = [
    "selling_price",
    "promo_flag",
    "stockout_flag",
    "day_of_week",
    "month",
    "weekend",
    "lag_1",
    "lag_7",
    "roll_mean_7",
]

model = joblib.load(MODEL_PATH)

horizon = 30
results = []

for sku, group in df.groupby("sku"):
    g = group.copy()
    last_date = g["date"].max()
    last_rows = g.tail(7).copy()
    roll = list(last_rows["units_sold"].values)
    lag1 = last_rows["units_sold"].iloc[-1]
    lag7 = roll[0]
    sp = float(g["selling_price"].iloc[-1])
    promo = int(g["promo_flag"].iloc[-1])
    stockout = int(g["stockout_flag"].iloc[-1])
    preds = []
    dates = []
    for i in range(1, horizon + 1):
        d = last_date + timedelta(days=i)
        day_of_week = d.weekday()
        month = d.month
        weekend = 1 if day_of_week >= 5 else 0
        row = pd.DataFrame([{
            "selling_price": sp,
            "promo_flag": promo,
            "stockout_flag": stockout,
            "day_of_week": day_of_week,
            "month": month,
            "weekend": weekend,
            "lag_1": lag1,
            "lag_7": lag7,
            "roll_mean_7": np.mean(roll[-7:]) if len(roll) >= 7 else np.mean(roll),
        }])
        yhat = float(model.predict(row[features])[0])
        yhat = max(0.0, yhat)
        preds.append(yhat)
        dates.append(d.strftime("%Y-%m-%d"))
        roll.append(yhat)
        lag7 = roll[-7] if len(roll) >= 7 else lag7
        lag1 = yhat
    avg_7 = float(np.mean(preds[:7]))
    avg_30 = float(np.mean(preds))
    rec_reorder = int(round(sum(preds[:14])))
    risk = "low"
    if avg_7 > 2 * float(np.mean(roll[-7:])):
        risk = "high"
    elif avg_7 > 1.2 * float(np.mean(roll[-7:])):
        risk = "medium"
    results.append({
        "sku": sku,
        "name": name_map.get(sku, sku),
        "avg_predicted_units_7d": avg_7,
        "avg_predicted_units_30d": avg_30,
        "recommended_reorder_qty_14d": rec_reorder,
        "risk": risk,
        "daily": [{"date": dates[i], "units": preds[i]} for i in range(len(dates))]
    })

import json
print(json.dumps({"forecasts": results}))
