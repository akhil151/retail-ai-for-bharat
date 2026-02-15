import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

# =====================================================
# CONFIG
# =====================================================

DAYS = 180
START_DATE = datetime(2025, 8, 1)

cities = [
    ("Bangalore","KA","560001"),
    ("Chennai","TN","600001"),
    ("Mumbai","MH","400001"),
    ("Delhi","DL","110001"),
    ("Hyderabad","TS","500001")
]

platforms = ["amazon", "flipkart", "meesho"]

# =====================================================
# PRODUCT MASTER (base catalog)
# =====================================================

products = [
    ("SKU001","Smartphone Alpha","Mobiles","Samsung",11000,14999),
    ("SKU002","Smartphone Beta","Mobiles","Realme",9000,11999),
    ("SKU003","Wireless Headphones","Audio","Boat",1200,2499),
    ("SKU004","Bluetooth Neckband","Audio","Boat",600,1499),
    ("SKU005","Power Bank 10000mAh","Accessories","Mi",500,999),
    ("SKU006","Fast Charger","Accessories","Mi",250,599),
    ("SKU007","USB Cable","Accessories","Generic",20,99)
]

base_df = pd.DataFrame(products, columns=[
    "sku","product_name","category","brand","cost_price","selling_price"
])

# =====================================================
# PRODUCT FILES
# =====================================================

amazon_products = []
flipkart_products = []
meesho_products = []

for _, row in base_df.iterrows():
    sku = row.sku
    asin = "B0" + str(random.randint(100000,999999))
    fsn = "FSN" + str(random.randint(100000,999999))
    pid = "PID" + str(random.randint(100000,999999))

    stock = random.randint(50,150)

    amazon_products.append([
        sku, asin, row.product_name, row.category, row.brand,
        row.selling_price+500, row.selling_price, stock,
        "New", "FBA", "Active"
    ])

    flipkart_products.append([
        sku, fsn, row.product_name, row.category, row.category,
        row.brand, row.selling_price+500, row.selling_price,
        stock, "ACTIVE", 2
    ])

    meesho_products.append([
        pid, sku, row.product_name, row.category, row.category,
        row.cost_price, row.selling_price, stock,
        "ACTIVE", 12
    ])

pd.DataFrame(amazon_products, columns=[
    "sku","asin","product_name","category","brand","listing_price",
    "your_price","quantity_available","condition","fulfillment_channel","status"
]).to_csv("amazon_products.csv", index=False)

pd.DataFrame(flipkart_products, columns=[
    "sku","fsn","product_title","vertical","sub_category","brand","mrp",
    "selling_price","stock_count","listing_status","procurement_sla"
]).to_csv("flipkart_products.csv", index=False)

pd.DataFrame(meesho_products, columns=[
    "product_id","sku","product_name","category","sub_category",
    "supplier_price","selling_price","stock_quantity","product_status","commission_rate"
]).to_csv("meesho_products.csv", index=False)


# =====================================================
# INVENTORY MASTER
# =====================================================

inventory = []

for _, row in base_df.iterrows():
    amazon_stock = random.randint(20,50)
    flipkart_stock = random.randint(20,50)
    meesho_stock = random.randint(20,50)

    inventory.append([
        row.sku,
        row.product_name,
        amazon_stock+flipkart_stock+meesho_stock,
        amazon_stock,
        flipkart_stock,
        meesho_stock,
        30,
        row.cost_price,
        datetime.now().strftime("%Y-%m-%d")
    ])

pd.DataFrame(inventory, columns=[
    "sku","product_name","total_stock","amazon_stock","flipkart_stock",
    "meesho_stock","reorder_level","cost_price","last_updated"
]).to_csv("inventory_master.csv", index=False)


# =====================================================
# PLATFORM FEES
# =====================================================

fees = [
    ("amazon","Mobiles",12,50,40,2,20),
    ("flipkart","Mobiles",14,45,35,2,20),
    ("meesho","Mobiles",10,30,25,2,10)
]

pd.DataFrame(fees, columns=[
    "platform","category","commission_percentage",
    "fixed_fee","shipping_fee","payment_gateway_fee","closing_fee"
]).to_csv("platform_fees.csv", index=False)


# =====================================================
# SALES GENERATOR
# =====================================================

def random_city():
    return random.choice(cities)

def daily_units(base):
    return max(1, int(np.random.normal(base, base*0.3)))

amazon_rows = []
flipkart_rows = []
meesho_rows = []

for d in range(DAYS):
    date = START_DATE + timedelta(days=d)

    for _, row in base_df.iterrows():

        units = daily_units(5)

        for _ in range(units):

            city,state,pincode = random_city()

            qty = random.randint(1,2)
            price = row.selling_price

            # AMAZON
            amazon_rows.append([
                f"A{random.randint(100000,999999)}",
                date.strftime("%Y-%m-%d"),
                row.sku,
                row.product_name,
                qty,
                price,
                price*0.18,
                40, 7, 0, 0,
                0,
                city,state,pincode,
                "B0TEST123",
                "FBA",
                "Amazon.in"
            ])

            # FLIPKART
            commission = price*0.14
            flipkart_rows.append([
                f"F{random.randint(100000,999999)}",
                date.strftime("%Y-%m-%d"),
                random.randint(10000,99999),
                row.sku,
                "FSNTEST",
                row.product_name,
                qty,
                price,
                price*qty,
                30,
                14,
                commission,
                10,
                5,
                5,
                2,
                price*qty-commission,
                "Delivered",
                city,state,pincode
            ])

            # MEESHO
            commission = price*0.1
            meesho_rows.append([
                f"M{random.randint(100000,999999)}",
                date.strftime("%Y-%m-%d"),
                "PIDTEST",
                row.product_name,
                row.sku,
                qty,
                price,
                price*qty,
                25,
                commission,
                2,
                price*qty-commission,
                "Delivered",
                city,state,pincode,
                "None"
            ])

# =====================================================
# SAVE SALES
# =====================================================

pd.DataFrame(amazon_rows, columns=[
"order_id","order_date","sku","product_name","quantity","item_price","item_tax",
"shipping_price","shipping_tax","gift_wrap_price","gift_wrap_tax",
"item_promotion_discount","ship_city","ship_state","ship_postal_code",
"asin","fulfillment_channel","sales_channel"
]).to_csv("amazon_sales.csv", index=False)

pd.DataFrame(flipkart_rows, columns=[
"order_id","order_date","order_item_id","sku","fsn","product_title","quantity",
"selling_price","total_price","shipping_fee","commission_rate","commission_amount",
"pick_and_pack_fee","fixed_fee","collection_fee","payment_rate","settlement_value",
"order_status","shipment_city","shipment_state","shipment_pincode"
]).to_csv("flipkart_sales.csv", index=False)

pd.DataFrame(meesho_rows, columns=[
"order_id","order_date","product_id","product_name","sku","quantity","selling_price",
"customer_paid_amount","shipping_charges","commission","payment_gateway_charges",
"seller_earnings","order_status","customer_city","customer_state","customer_pincode",
"return_status"
]).to_csv("meesho_sales.csv", index=False)

print("✅ All marketplace CSVs generated successfully!")
