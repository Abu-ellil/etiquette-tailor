import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

const dbPath = path.join(app.getPath('userData'), 'app.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db;

export function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT,
      name_en TEXT NOT NULL,
      prefix TEXT UNIQUE NOT NULL,
      last_sequence INTEGER DEFAULT 0,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','reception','worker')),
      worker_type TEXT CHECK(worker_type IN ('tailor','cutter','designer',NULL)),
      branch_id INTEGER REFERENCES branches(id),
      base_salary REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      branch_id INTEGER REFERENCES branches(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      branch_id INTEGER NOT NULL REFERENCES branches(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      piece_type TEXT NOT NULL CHECK(piece_type IN ('جلابية','عباية','فستان','تعديل','other')),
      details TEXT,
      price REAL NOT NULL,
      paid REAL DEFAULT 0,
      balance REAL GENERATED ALWAYS AS (price - paid) VIRTUAL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card')),
      status TEXT NOT NULL CHECK(status IN ('intake','cutting','sewing','ready','delivered')) DEFAULT 'intake',
      receive_date DATE,
      delivery_date DATE,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON delete cascade,
      chest REAL,
      waist REAL,
      hips REAL,
      length REAL,
      sleeve REAL,
      shoulder REAL,
      notes TEXT,
      taken_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_measurement_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      label TEXT,
      chest REAL,
      waist REAL,
      hips REAL,
      length REAL,
      sleeve REAL,
      shoulder REAL,
      notes TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      task_type TEXT NOT NULL CHECK(task_type IN ('cutting','sewing','design')),
      assigned_to INTEGER REFERENCES users(id),
      wage_type TEXT NOT NULL CHECK(wage_type IN ('percentage','fixed')),
      wage_rate REAL NOT NULL,
      wage_amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','in_progress','done')) DEFAULT 'pending',
      started_at DATETIME,
      completed_at DATETIME,
      notes TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS worker_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      piece_type TEXT NOT NULL,
      wage_type TEXT NOT NULL CHECK(wage_type IN ('percentage','fixed')),
      rate REAL NOT NULL,
      season_start DATE,
      season_end DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) UNIQUE,
      generated_at DATETIME,
      printed_at DATETIME,
      sent_via_whatsapp INTEGER DEFAULT 0
    )
  `);

  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get() as { count: number };
  if (branchCount.count === 0) {
    seedDatabase();
  }

  // Migration: Fix plain text passwords
  migratePasswords();

  console.log('Database schema initialized successfully');
}

function migratePasswords() {
  const users = db.prepare('SELECT id, username, password_hash FROM users').all() as any[];

  for (const user of users) {
    // Check if password is plain text (not a 64-character hex string)
    if (user.password_hash.length !== 64 || !/^[a-f0-9]{64}$/.test(user.password_hash)) {
      console.log(`Migrating password for user: ${user.username}`);
      const hashedPassword = hashPassword(user.password_hash);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, user.id);
    }
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function seedDatabase() {
  const insertBranch = db.prepare(
    'INSERT INTO branches (name_ar, name_en, prefix, last_sequence, address) VALUES (?, ?, ?, ?, ?)'
  );

  insertBranch.run('الميرة', 'Al Mera Branch', 'A', 0, 'أم قرن - الميرة');
  insertBranch.run('الشارع التجاري', 'Al Trade Street Branch', 'B', 0, 'أم قرن - الشارع التجاري');

  const insertUser = db.prepare(
    'INSERT INTO users (name, username, password_hash, role, worker_type, branch_id, base_salary) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  insertUser.run('Admin', 'admin', hashPassword('admin123'), 'admin', null, 1, 0);
}
