import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:hi@localhost:5432/marketplace';

const pool = new Pool({ connectionString });

export const db = drizzle(pool);
export { pool }; // Export pool for raw SQL queries


export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 255 }).notNull(),
  price: varchar('price', { length: 50 }).notNull(),
  marketplace: varchar('marketplace', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  fsn: varchar('fsn', { length: 255 }),
  product_title: text('product_title'),
  vertical: varchar('vertical', { length: 255 }),
  sub_category: varchar('sub_category', { length: 255 }),
  brand: varchar('brand', { length: 255 }),
  mrp: varchar('mrp', { length: 50 }),
  selling_price: varchar('selling_price', { length: 50 }),
  stock_count: varchar('stock_count', { length: 50 }),
  listing_status: varchar('listing_status', { length: 100 }),
  procurement_sla: varchar('procurement_sla', { length: 100 }),
  asin: varchar('asin', { length: 255 }),
  category: varchar('category', { length: 255 }),
  listing_price: varchar('listing_price', { length: 50 }),
  your_price: varchar('your_price', { length: 50 }),
  quantity_available: varchar('quantity_available', { length: 50 }),
  condition: varchar('condition', { length: 100 }),
  fulfillment_channel: varchar('fulfillment_channel', { length: 100 }),
  status: varchar('status', { length: 100 }),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  date: varchar('date', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  error: text('error'),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }).notNull(),
  product_name: text('product_name').notNull(),
  total_stock: integer('total_stock').notNull(),
  amazon_stock: integer('amazon_stock').notNull(),
  flipkart_stock: integer('flipkart_stock').notNull(),
  meesho_stock: integer('meesho_stock').notNull(),
  reorder_level: integer('reorder_level').notNull(),
  cost_price: varchar('cost_price', { length: 50 }).notNull(),
  last_updated: varchar('last_updated', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  platforms: text('platforms').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const inventory_master = pgTable('inventory_master', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 255 }).notNull(),
  product_name: text('product_name'),
  total_stock: integer('total_stock').default(0),
  amazon_stock: integer('amazon_stock').default(0),
  flipkart_stock: integer('flipkart_stock').default(0),
  meesho_stock: integer('meesho_stock').default(0),
  cost_price: varchar('cost_price', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platform_fees = pgTable('platform_fees', {
  id: serial('id').primaryKey(),
  platform: varchar('platform', { length: 100 }).notNull(),
  percent: varchar('percent', { length: 50 }).notNull(),
  fixed: varchar('fixed', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
