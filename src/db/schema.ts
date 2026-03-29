import db from './connection';

// Initialize database schema
export function initializeSchema() {
  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      branch TEXT NOT NULL CHECK(branch IN ('A', 'B')),
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Measurements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      piece_type TEXT NOT NULL,
      chest REAL,
      waist REAL,
      hips REAL,
      length REAL,
      shoulders REAL,
      sleeve_length REAL,
      neck REAL,
      notes TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Workers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      branch TEXT NOT NULL CHECK(branch IN ('A', 'B')),
      wage_type TEXT NOT NULL CHECK(wage_type IN ('percentage', 'fixed')),
      wage_rate REAL NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      piece_type TEXT NOT NULL,
      measurements_id INTEGER,
      price REAL NOT NULL,
      paid REAL DEFAULT 0,
      balance REAL GENERATED ALWAYS AS (price - paid) STORED,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'In Progress' CHECK(status IN ('In Progress', 'Ready', 'Delivered')),
      payment_type TEXT NOT NULL CHECK(payment_type IN ('Cash', 'Card')),
      branch TEXT NOT NULL CHECK(branch IN ('A', 'B')),
      notes TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (worker_id) REFERENCES workers(id),
      FOREIGN KEY (measurements_id) REFERENCES measurements(id)
    )
  `);

  // Order counters for each branch
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_counters (
      branch TEXT PRIMARY KEY CHECK(branch IN ('A', 'B')),
      counter INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Initialize counters if not exists
  const counters = db.prepare('SELECT COUNT(*) as count FROM order_counters').get() as { count: number };
  if (counters.count === 0) {
    db.prepare('INSERT INTO order_counters (branch, counter) VALUES (?, ?)').run('A', 0);
    db.prepare('INSERT INTO order_counters (branch, counter) VALUES (?, ?)').run('B', 0);
  }

  console.log('Database schema initialized successfully');
}
