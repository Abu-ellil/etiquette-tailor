-- Run this in your Supabase SQL Editor to set up the required tables

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  branch TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  rate INTEGER,
  fixed_amount REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  branch TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  piece_type TEXT,
  price REAL NOT NULL,
  paid REAL DEFAULT 0,
  balance REAL GENERATED ALWAYS AS (price - paid) STORED,
  worker_id TEXT,
  worker_name TEXT,
  worker_wage REAL DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'In Progress',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (optional, disable if you want public access)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for analytics)
CREATE POLICY "Public read access" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read access" ON customers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON workers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON branches FOR SELECT USING (true);
