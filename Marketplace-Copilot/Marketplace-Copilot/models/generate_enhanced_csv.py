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

# Expanded city list with realistic pincodes
cities = [
    ("Bangalore", "Karnataka", "560001"), ("Bangalore", "Karnataka", "560038"),
    ("Chennai", "Tamil Nadu", "600001"), ("Chennai", "Tamil Nadu", "600034"),
    ("Mumbai", "Maharashtra", "400001"), ("Mumbai", "Maharashtra", "400053"),
    ("Delhi", "Delhi", "110001"), ("Delhi", "Delhi", "110092"),
    ("Hyderabad", "Telangana", "500001"), ("Hyderabad", "Telangana", "500081"),
    ("Pune", "Maharashtra", "411001"), ("Pune", "Maharashtra", "411045"),
    ("Ahmedabad", "Gujarat", "380001"), ("Ahmedabad", "Gujarat", "380054"),
    ("Kolkata", "West Bengal", "700001"), ("Kolkata", "West Bengal", "700091"),
    ("Jaipur", "Rajasthan", "302001"), ("Jaipur", "Rajasthan", "302017"),
    ("Lucknow", "Uttar Pradesh", "226001"), ("Lucknow", "Uttar Pradesh", "226028"),
    ("Coimbatore", "Tamil Nadu", "641001"), ("Coimbatore", "Tamil Nadu", "641035"),
    ("Indore", "Madhya Pradesh", "452001"), ("Indore", "Madhya Pradesh", "452016"),
    ("Kochi", "Kerala", "682001"), ("Kochi", "Kerala", "682035"),
    ("Chandigarh", "Chandigarh", "160001"), ("Chandigarh", "Chandigarh", "160036"),
    ("Nagpur", "Maharashtra", "440001"), ("Nagpur", "Maharashtra", "440027")
]

platforms = ["amazon", "flipkart", "meesho"]

# =====================================================
# ENHANCED PRODUCT MASTER (realistic catalog)
# =====================================================

products = [
    # Mobiles - High value items
    ("SKU001", "Samsung Galaxy M34 5G (6GB+128GB)", "Mobiles", "Samsung", 13500, 16999),
    ("SKU002", "Realme Narzo 60 Pro 5G (8GB+128GB)", "Mobiles", "Realme", 17500, 21999),
    ("SKU003", "Redmi Note 13 Pro (8GB+256GB)", "Mobiles", "Xiaomi", 19000, 23999),
    ("SKU004", "OnePlus Nord CE 3 Lite 5G", "Mobiles", "OnePlus", 15000, 19999),
    ("SKU005", "Poco X6 5G (8GB+256GB)", "Mobiles", "Poco", 16500, 20999),
    
    # Audio - Popular accessories
    ("SKU006", "boAt Rockerz 450 Bluetooth Headphones", "Audio", "boAt", 950, 1799),
    ("SKU007", "boAt Airdopes 131 TWS Earbuds", "Audio", "boAt", 850, 1499),
    ("SKU008", "Noise Buds VS104 Plus TWS", "Audio", "Noise", 700, 1299),
    ("SKU009", "JBL C100SI Wired Earphones", "Audio", "JBL", 380, 699),
    ("SKU010", "Sony WH-CH520 Wireless Headphones", "Audio", "Sony", 2800, 4990),
    
    # Mobile Accessories
    ("SKU011", "Mi Power Bank 3i 20000mAh", "Accessories", "Mi", 1200, 1999),
    ("SKU012", "Ambrane 10000mAh Power Bank", "Accessories", "Ambrane", 550, 899),
    ("SKU013", "Portronics 20W Fast Charger", "Accessories", "Portronics", 280, 499),
    ("SKU014", "Anker 30W USB-C Charger", "Accessories", "Anker", 950, 1699),
    ("SKU015", "Samsung 25W Super Fast Charger", "Accessories", "Samsung", 750, 1299),
    
    # Cables & Connectors
    ("SKU016", "boAt Deuce USB 300 Type-C Cable", "Accessories", "boAt", 120, 249),
    ("SKU017", "Mi Braided USB-C Cable 1.5m", "Accessories", "Mi", 180, 349),
    ("SKU018", "AmazonBasics Lightning to USB-A Cable", "Accessories", "AmazonBasics", 280, 499),
    
    # Phone Cases & Protection
    ("SKU019", "Spigen Tough Armor Case", "Accessories", "Spigen", 380, 699),
    ("SKU020", "Case-U Silicone Back Cover", "Accessories", "Case-U", 95, 199),
    ("SKU021", "Gorilla Armored Tempered Glass", "Accessories", "Gorilla", 150, 299),
    
    # Smart Watches & Fitness
    ("SKU022", "Noise ColorFit Pro 4 Alpha", "Wearables", "Noise", 1600, 2799),
    ("SKU023", "Fire-Boltt Phoenix Ultra", "Wearables", "Fire-Boltt", 1400, 2499),
    ("SKU024", "boAt Wave Call 2", "Wearables", "boAt", 1100, 1999),
    ("SKU025", "Amazfit Bip 3 Pro", "Wearables", "Amazfit", 2200, 3999),
    
    # Computer Accessories
    ("SKU026", "Logitech M331 Silent Plus Mouse", "Computer", "Logitech", 580, 995),
    ("SKU027", "HP X1000 Wired Mouse", "Computer", "HP", 220, 399),
    ("SKU028", "Zebronics Zeb-K25 USB Keyboard", "Computer", "Zebronics", 280, 499),
    ("SKU029", "Portronics Toad 23 USB Hub", "Computer", "Portronics", 380, 699),
    ("SKU030", "SanDisk 64GB Cruzer Blade USB", "Computer", "SanDisk", 380, 699)
]

base_df = pd.DataFrame(products, columns=[
    "sku", "product_name", "category", "brand", "cost_price", "selling_price"
])

# =====================================================
# ENHANCED PRODUCT FILES WITH REALISTIC DATA
# =====================================================

amazon_products = []
flipkart_products = []
meesho_products = []

for _, row in base_df.iterrows():
    sku = row.sku
    # Realistic ASIN format
    asin = "B0" + ''.join([str(random.randint(0, 9)) for _ in range(8)])
    # Realistic FSN format
    fsn = "FSN" + ''.join([random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(12)])
    # Realistic Product ID
    pid = "P" + ''.join([str(random.randint(0, 9)) for _ in range(10)])
    
    # Realistic stock levels based on category
    if row.category == "Mobiles":
        stock = random.randint(25, 80)
    elif row.category == "Audio":
        stock = random.randint(100, 300)
    elif row.category == "Wearables":
        stock = random.randint(50, 150)
    else:
        stock = random.randint(150, 500)
    
    # Amazon listing with realistic MRP markup
    mrp_markup = random.choice([1.15, 1.20, 1.25, 1.30])
    listing_price = int(row.selling_price * mrp_markup)
    
    fulfillment = random.choice(["FBA", "FBA", "FBA", "FBM"])  # 75% FBA
    
    amazon_products.append([
        sku, asin, row.product_name, row.category, row.brand,
        listing_price, row.selling_price, stock,
        "New", fulfillment, "Active"
    ])
    
    # Flipkart listing
    sub_category = {
        "Mobiles": "Smartphones",
        "Audio": "Headphones & Earphones",
        "Accessories": "Mobile Accessories",
        "Wearables": "Smart Watches",
        "Computer": "Computer Peripherals"
    }.get(row.category, row.category)
    
    flipkart_products.append([
        sku, fsn, row.product_name, row.category, sub_category,
        row.brand, listing_price, row.selling_price,
        stock, "ACTIVE", random.choice([2, 3, 4])
    ])
    
    # Meesho listing with higher commission
    meesho_commission = {
        "Mobiles": 8,
        "Audio": 12,
        "Accessories": 15,
        "Wearables": 10,
        "Computer": 12
    }.get(row.category, 12)
    
    meesho_products.append([
        pid, sku, row.product_name, row.category, sub_category,
        row.cost_price, row.selling_price, stock,
        "ACTIVE", meesho_commission
    ])

pd.DataFrame(amazon_products, columns=[
    "sku", "asin", "product_name", "category", "brand", "listing_price",
    "your_price", "quantity_available", "condition", "fulfillment_channel", "status"
]).to_csv("amazon_products.csv", index=False)

pd.DataFrame(flipkart_products, columns=[
    "sku", "fsn", "product_title", "vertical", "sub_category", "brand", "mrp",
    "selling_price", "stock_count", "listing_status", "procurement_sla"
]).to_csv("flipkart_products.csv", index=False)

pd.DataFrame(meesho_products, columns=[
    "product_id", "sku", "product_name", "category", "sub_category",
    "supplier_price", "selling_price", "stock_quantity", "product_status", "commission_rate"
]).to_csv("meesho_products.csv", index=False)

print("✅ Product catalogs generated")

# =====================================================
# ENHANCED INVENTORY MASTER
# =====================================================

inventory = []

for _, row in base_df.iterrows():
    # Stock distribution based on platform popularity
    total_inventory = random.randint(100, 800)
    
    # Amazon typically has 35-40% of stock
    amazon_stock = int(total_inventory * random.uniform(0.35, 0.40))
    # Flipkart has 30-35%
    flipkart_stock = int(total_inventory * random.uniform(0.30, 0.35))
    # Meesho gets the rest
    meesho_stock = total_inventory - amazon_stock - flipkart_stock
    
    # Reorder level is typically 20-25% of total stock
    reorder_level = int(total_inventory * 0.22)
    
    inventory.append([
        row.sku,
        row.product_name,
        total_inventory,
        amazon_stock,
        flipkart_stock,
        meesho_stock,
        reorder_level,
        row.cost_price,
        (datetime.now() - timedelta(days=random.randint(0, 7))).strftime("%Y-%m-%d")
    ])

pd.DataFrame(inventory, columns=[
    "sku", "product_name", "total_stock", "amazon_stock", "flipkart_stock",
    "meesho_stock", "reorder_level", "cost_price", "last_updated"
]).to_csv("inventory_master.csv", index=False)

print("✅ Inventory master generated")

# =====================================================
# ENHANCED PLATFORM FEES
# =====================================================

fees = [
    # Amazon fees by category
    ("amazon", "Mobiles", 6.5, 20, 45, 1.8, 15),
    ("amazon", "Audio", 10.0, 20, 40, 1.8, 15),
    ("amazon", "Accessories", 12.0, 15, 35, 1.8, 10),
    ("amazon", "Wearables", 9.0, 20, 40, 1.8, 15),
    ("amazon", "Computer", 8.5, 20, 40, 1.8, 15),
    
    # Flipkart fees
    ("flipkart", "Mobiles", 7.0, 25, 42, 2.0, 18),
    ("flipkart", "Audio", 11.0, 20, 38, 2.0, 15),
    ("flipkart", "Accessories", 13.0, 15, 32, 2.0, 12),
    ("flipkart", "Wearables", 10.0, 20, 38, 2.0, 15),
    ("flipkart", "Computer", 9.0, 20, 38, 2.0, 15),
    
    # Meesho fees (typically lower)
    ("meesho", "Mobiles", 8.0, 15, 30, 2.5, 10),
    ("meesho", "Audio", 12.0, 12, 28, 2.5, 8),
    ("meesho", "Accessories", 15.0, 10, 25, 2.5, 5),
    ("meesho", "Wearables", 10.0, 12, 28, 2.5, 8),
    ("meesho", "Computer", 12.0, 12, 28, 2.5, 8)
]

pd.DataFrame(fees, columns=[
    "platform", "category", "commission_percentage",
    "fixed_fee", "shipping_fee", "payment_gateway_fee", "closing_fee"
]).to_csv("platform_fees.csv", index=False)

print("✅ Platform fees generated")

# =====================================================
# ENHANCED SALES GENERATOR
# =====================================================

def random_city():
    return random.choice(cities)

def daily_units(base, category):
    """Generate realistic daily sales based on category"""
    if category == "Mobiles":
        return max(1, int(np.random.normal(base * 0.8, base * 0.3)))
    elif category == "Audio":
        return max(1, int(np.random.normal(base * 1.2, base * 0.4)))
    elif category == "Accessories":
        return max(2, int(np.random.normal(base * 1.5, base * 0.5)))
    elif category == "Wearables":
        return max(1, int(np.random.normal(base, base * 0.3)))
    else:
        return max(1, int(np.random.normal(base, base * 0.3)))

def get_fee_info(platform, category):
    """Get fee information for a platform-category combination"""
    fee_row = None
    for _, row in pd.read_csv("platform_fees.csv").iterrows():
        if row['platform'] == platform and row['category'] == category:
            fee_row = row
            break
    return fee_row

amazon_rows = []
flipkart_rows = []
meesho_rows = []

# Generate product lookup for ASINs, FSNs, PIDs
product_lookups = {}
for _, row in pd.read_csv("amazon_products.csv").iterrows():
    if row['sku'] not in product_lookups:
        product_lookups[row['sku']] = {}
    product_lookups[row['sku']]['amazon_asin'] = row['asin']
    product_lookups[row['sku']]['fulfillment'] = row['fulfillment_channel']

for _, row in pd.read_csv("flipkart_products.csv").iterrows():
    if row['sku'] not in product_lookups:
        product_lookups[row['sku']] = {}
    product_lookups[row['sku']]['flipkart_fsn'] = row['fsn']

for _, row in pd.read_csv("meesho_products.csv").iterrows():
    if row['sku'] not in product_lookups:
        product_lookups[row['sku']] = {}
    product_lookups[row['sku']]['meesho_pid'] = row['product_id']

order_statuses = ["Delivered", "Shipped", "Pending", "Cancelled"]

for d in range(DAYS):
    date = START_DATE + timedelta(days=d)
    
    # Weekend boost (20% more sales)
    weekend_factor = 1.2 if date.weekday() in [5, 6] else 1.0
    
    for _, row in base_df.iterrows():
        base_units = 8
        units = int(daily_units(base_units, row.category) * weekend_factor)
        
        # Get fee information
        amazon_fees = get_fee_info('amazon', row.category)
        flipkart_fees = get_fee_info('flipkart', row.category)
        meesho_fees = get_fee_info('meesho', row.category)
        
        for _ in range(units):
            city, state, pincode = random_city()
            qty = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
            
            # Realistic price variation (±5%)
            price_variation = random.uniform(0.97, 1.03)
            price = int(row.selling_price * price_variation)
            
            # AMAZON
            asin = product_lookups[row.sku].get('amazon_asin', 'B000000000')
            fulfillment = product_lookups[row.sku].get('fulfillment', 'FBA')
            
            item_total = price * qty
            item_tax = round(item_total * 0.18, 2)
            
            # Shipping varies by fulfillment
            shipping_price = 0 if fulfillment == "FBA" else amazon_fees['shipping_fee']
            shipping_tax = round(shipping_price * 0.18, 2) if shipping_price > 0 else 0
            
            # Occasional gift wrap and promotions
            gift_wrap = random.choices([0, 25, 50], weights=[90, 7, 3])[0]
            gift_wrap_tax = round(gift_wrap * 0.18, 2) if gift_wrap > 0 else 0
            promotion = random.choices([0, price * 0.05, price * 0.10], weights=[85, 10, 5])[0]
            
            order_status = random.choices(order_statuses, weights=[80, 10, 5, 5])[0]
            
            amazon_rows.append([
                f"A{random.randint(100, 999)}-{random.randint(1000000, 9999999)}-{random.randint(1000000, 9999999)}",
                date.strftime("%Y-%m-%d"),
                row.sku,
                row.product_name,
                qty,
                price,
                item_tax,
                shipping_price,
                shipping_tax,
                gift_wrap,
                gift_wrap_tax,
                round(promotion, 2),
                city, state, pincode,
                asin,
                fulfillment,
                "Amazon.in"
            ])
            
            # FLIPKART
            fsn = product_lookups[row.sku].get('flipkart_fsn', 'FSN000000000000')
            
            item_total = price * qty
            commission_pct = flipkart_fees['commission_percentage']
            commission = round(item_total * (commission_pct / 100), 2)
            
            pick_pack = flipkart_fees['fixed_fee']
            fixed_fee = random.choice([10, 12, 15])
            collection_fee = round(item_total * 0.02, 2)
            payment_rate = flipkart_fees['payment_gateway_fee']
            
            settlement = round(item_total - commission - pick_pack - fixed_fee - 
                             collection_fee - flipkart_fees['shipping_fee'], 2)
            
            order_status = random.choices(order_statuses, weights=[80, 10, 5, 5])[0]
            
            flipkart_rows.append([
                f"FKO{random.randint(100000000000, 999999999999)}",
                date.strftime("%Y-%m-%d"),
                random.randint(100000000, 999999999),
                row.sku,
                fsn,
                row.product_name,
                qty,
                price,
                item_total,
                flipkart_fees['shipping_fee'],
                commission_pct,
                commission,
                pick_pack,
                fixed_fee,
                collection_fee,
                payment_rate,
                settlement,
                order_status,
                city, state, pincode
            ])
            
            # MEESHO
            pid = product_lookups[row.sku].get('meesho_pid', 'P0000000000')
            
            item_total = price * qty
            commission_pct = meesho_fees['commission_percentage']
            commission = round(item_total * (commission_pct / 100), 2)
            
            shipping = meesho_fees['shipping_fee']
            pg_charges = round(item_total * (meesho_fees['payment_gateway_fee'] / 100), 2)
            
            seller_earnings = round(item_total - commission - pg_charges, 2)
            
            order_status = random.choices(order_statuses, weights=[80, 10, 5, 5])[0]
            return_status = random.choices(["None", "Requested", "Approved", "Completed"], 
                                          weights=[92, 3, 3, 2])[0]
            
            meesho_rows.append([
                f"M{random.randint(10000000000, 99999999999)}",
                date.strftime("%Y-%m-%d"),
                pid,
                row.product_name,
                row.sku,
                qty,
                price,
                item_total,
                shipping,
                commission,
                pg_charges,
                seller_earnings,
                order_status,
                city, state, pincode,
                return_status
            ])

# =====================================================
# SAVE ENHANCED SALES FILES
# =====================================================

pd.DataFrame(amazon_rows, columns=[
    "order_id", "order_date", "sku", "product_name", "quantity", "item_price", "item_tax",
    "shipping_price", "shipping_tax", "gift_wrap_price", "gift_wrap_tax",
    "item_promotion_discount", "ship_city", "ship_state", "ship_postal_code",
    "asin", "fulfillment_channel", "sales_channel"
]).to_csv("amazon_sales.csv", index=False)

pd.DataFrame(flipkart_rows, columns=[
    "order_id", "order_date", "order_item_id", "sku", "fsn", "product_title", "quantity",
    "selling_price", "total_price", "shipping_fee", "commission_rate", "commission_amount",
    "pick_and_pack_fee", "fixed_fee", "collection_fee", "payment_rate", "settlement_value",
    "order_status", "shipment_city", "shipment_state", "shipment_pincode"
]).to_csv("flipkart_sales.csv", index=False)

pd.DataFrame(meesho_rows, columns=[
    "order_id", "order_date", "product_id", "product_name", "sku", "quantity", "selling_price",
    "customer_paid_amount", "shipping_charges", "commission", "payment_gateway_charges",
    "seller_earnings", "order_status", "customer_city", "customer_state", "customer_pincode",
    "return_status"
]).to_csv("meesho_sales.csv", index=False)

print("✅ Sales data generated")
print(f"\n📊 Summary:")
print(f"   - Products: {len(base_df)} SKUs")
print(f"   - Amazon orders: {len(amazon_rows):,}")
print(f"   - Flipkart orders: {len(flipkart_rows):,}")
print(f"   - Meesho orders: {len(meesho_rows):,}")
print(f"   - Total orders: {len(amazon_rows) + len(flipkart_rows) + len(meesho_rows):,}")
print(f"   - Date range: {START_DATE.strftime('%Y-%m-%d')} to {(START_DATE + timedelta(days=DAYS-1)).strftime('%Y-%m-%d')}")
print("\n✅ All enhanced marketplace CSVs generated successfully!")
