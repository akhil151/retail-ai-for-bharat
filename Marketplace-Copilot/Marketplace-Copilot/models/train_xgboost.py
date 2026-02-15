import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import matplotlib.pyplot as plt
import joblib
import os

# =========================
# LOAD DATA
# =========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "sales.csv")

df = pd.read_csv(DATA_PATH)

df["date"] = pd.to_datetime(df["date"])

# =========================
# FEATURE ENGINEERING
# =========================

df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["weekend"] = (df["day_of_week"] >= 5).astype(int)

# lag features (IMPORTANT)
df["lag_1"] = df.groupby("sku")["units_sold"].shift(1)
df["lag_7"] = df.groupby("sku")["units_sold"].shift(7)
df["lag_14"] = df.groupby("sku")["units_sold"].shift(14)

# rolling averages
df["roll_mean_7"] = df.groupby("sku")["units_sold"].shift(1).rolling(7).mean()
df["roll_mean_14"] = df.groupby("sku")["units_sold"].shift(1).rolling(14).mean()

df = df.dropna()

# =========================
# FEATURES & TARGET
# =========================

features = [
    "selling_price",
    "promo_flag",
    "stockout_flag",
    "day_of_week",
    "month",
    "weekend",
    "lag_1",
    "lag_7",
    "lag_14",
    "roll_mean_7",
    "roll_mean_14"
]

X = df[features]
y = df["units_sold"]

# =========================
# TRAIN TEST SPLIT
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False
)

# =========================
# XGBOOST MODEL
# =========================

model = xgb.XGBRegressor(
    objective="reg:squarederror",
    n_estimators=800,
    max_depth=6,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=1.0,
    gamma=0.0,
    n_jobs=-1,
    random_state=42
)

model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_test, y_test)],
    verbose=False,
    early_stopping_rounds=50
)

# =========================
# EVALUATE
# =========================

preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)
print(f"MAE: {mae:.2f} units")

# =========================
# SAVE MODEL
# =========================

MODEL_PATH = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_PATH, exist_ok=True)

joblib.dump(model, os.path.join(MODEL_PATH, "demand_model.pkl"))

print("Model saved!")

# =========================
# TREND PLOT
# =========================

plt.figure(figsize=(10,5))
plt.plot(y_test.values, label="Actual")
plt.plot(preds, label="Predicted")
plt.legend()
plt.title("Demand Prediction vs Actual")
plt.show()
