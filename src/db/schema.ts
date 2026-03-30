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
    CREATE TABLE IF NOT EXISTS piece_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('custom_wear','abaya','uniform','alteration','special')),
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      UNIQUE(name_en, category)
    )
  `);

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
      piece_type TEXT NOT NULL,
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get() as { count: number };
  if (branchCount.count === 0) {
    seedDatabase();
  }

  // Seed piece types if empty
  const pieceTypeCount = db.prepare('SELECT COUNT(*) as count FROM piece_types').get() as { count: number };
  if (pieceTypeCount.count === 0) {
    seedPieceTypes();
  }

  // Seed default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    seedSettings();
  }

  // Migrations: add missing columns to existing tables
  migrateColumns();

  // Migration: Fix plain text passwords
  migratePasswords();

  console.log('Database schema initialized successfully');
}

function migrateColumns() {
  const tables: Record<string, string[]> = {};

  // Get existing columns for each table
  for (const table of ['orders', 'users', 'customers', 'order_tasks', 'worker_rates']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    tables[table] = cols.map((c) => c.name);
  }

  // Add missing columns
  const migrations: [string, string, string][] = [
    ['orders', 'receive_date', 'DATE'],
    ['orders', 'delivery_date', 'DATE'],
    ['orders', 'created_by', 'INTEGER REFERENCES users(id)'],
  ];

  for (const [table, column, def] of migrations) {
    if (!tables[table]?.includes(column)) {
      console.log(`Migrating: ALTER TABLE ${column} ${def}`);
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
  }

  // Migrate orders.piece_type from CHECK constraint to free text (referencing piece_types.name_en)
  // SQLite doesn't support ALTER TABLE DROP CHECK, so we recreate the table if needed
  try {
    const hasConstraint = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get() as { sql: string } | undefined;
    if (hasConstraint?.sql?.includes("CHECK(piece_type IN")) {
      console.log('Migrating: removing piece_type CHECK constraint from orders');
      db.exec(`
        CREATE TABLE IF NOT EXISTS orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL UNIQUE,
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          customer_id INTEGER NOT NULL REFERENCES customers(id),
          piece_type TEXT NOT NULL,
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
      db.exec(`INSERT INTO orders_new SELECT * FROM orders`);
      db.exec(`DROP TABLE orders`);
      db.exec(`ALTER TABLE orders_new RENAME TO orders`);
    }
  } catch (e) {
    console.log('orders migration skipped or already applied:', (e as Error).message);
  }
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

function seedSettings() {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('shop_name_ar', 'إتيكيت خياط');
  insertSetting.run('shop_name_en', 'Etiquette Tailor');
  insertSetting.run('shop_phone', '');
  insertSetting.run('currency', 'QAR');
  insertSetting.run('receipt_footer', 'Thank you for choosing Etiquette Tailor');
  insertSetting.run('tax_rate', '0');
}

function seedPieceTypes() {
  const insert = db.prepare(
    'INSERT INTO piece_types (name_en, name_ar, category, sort_order) VALUES (?, ?, ?, ?)'
  );

  const types: [string, string, string, number][] = [
    // Custom Wear
    ['Jalabiya (No Lining)', 'جلابية بدون بطانة', 'custom_wear', 1],
    ['Jalabiya (With Lining)', 'جلابية مع البطانة', 'custom_wear', 2],
    ['Dress', 'فستان', 'custom_wear', 3],
    ['Evening Dress', 'فستان سهرة', 'custom_wear', 4],
    ['Casual Dress', 'فستان يومي', 'custom_wear', 5],
    ['Kaftan', 'قفطان', 'custom_wear', 6],
    ['Skirt', 'تنورة', 'custom_wear', 7],
    ['Blouse', 'بلوزة', 'custom_wear', 8],
    ['Top', 'توب', 'custom_wear', 9],
    ['Pants', 'بنطلون', 'custom_wear', 10],
    // Abaya
    ['Classic Abaya', 'عباية سادة', 'abaya', 11],
    ['Embroidered Abaya', 'عباية مطرزة', 'abaya', 12],
    ['Open Abaya', 'عباية مفتوحة', 'abaya', 13],
    ['Luxury Abaya', 'عباية فخمة', 'abaya', 14],
    ['Daily Abaya', 'عباية يومية', 'abaya', 15],
    // Uniforms
    ['School Uniform (Primary)', 'يونفورم ابتدائي', 'uniform', 16],
    ['School Uniform (Middle)', 'يونفورم إعدادي', 'uniform', 17],
    ['School Uniform (High School)', 'يونفورم ثانوي', 'uniform', 18],
    ['Staff Uniform', 'يونفورم موظفات', 'uniform', 19],
    ['Nurse Uniform', 'يونفورم طبي', 'uniform', 20],
    ['Company Uniform', 'يونفورم شركات', 'uniform', 21],
    // Alterations
    ['Shortening', 'تقصير', 'alteration', 22],
    ['Length Adjustment', 'تعديل طول', 'alteration', 23],
    ['Waist Adjustment', 'تضييق / توسيع', 'alteration', 24],
    ['Sleeve Adjustment', 'تعديل أكمام', 'alteration', 25],
    ['Repair', 'إصلاح', 'alteration', 26],
    ['Zipper Change', 'تغيير سحاب', 'alteration', 27],
    ['Button Fix', 'تركيب أزرار', 'alteration', 28],
    // Special Orders
    ['Custom Design', 'تصميم خاص', 'special', 29],
    ['Embroidery Only', 'تطريز فقط', 'special', 30],
    ['Fabric Stitching', 'تفصيل قماش جاهز', 'special', 31],
    ['Re-Stitch', 'إعادة تفصيل', 'special', 32],
    ['Bridal Dress', 'فستان عروس', 'special', 33],
    ['Kids Wear', 'ملابس أطفال', 'special', 34],
  ];

  const tx = db.transaction(() => {
    for (const t of types) {
      insert.run(t[0], t[1], t[2], t[3]);
    }
  });
  tx();
}
