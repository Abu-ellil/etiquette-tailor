# Etiquette Tailor — Project Plan (v2)
> Spec-Driven Development using Spec Kit + Claude Code
> Updated to reflect full business model analysis

---

## Business Model Summary

**Two branches**, each running independently offline.
**Four roles** with different access levels.
**Every order** moves through a production pipeline: Reception → Cutter → Tailor → Delivery.
**Every stage** of production is tracked as a separate task, assigned to a specific worker, with its own auto-calculated wage.

---

## Constitution (Non-Negotiable Rules)

### Language
- UI: English only
- Customer data (names, notes, details): Arabic + English, UTF-8, RTL-compatible
- Invoice: bilingual Arabic + English

### Business Logic
- `Balance = Price - Paid` — always auto-calculated, never editable manually
- One order can have **multiple workers** (cutter + tailor), each with their own wage record in `order_tasks`
- Worker wage per task = `Price × percentage` OR fixed amount (stored per worker per piece type)
- Workers can have a base monthly salary **in addition to** per-piece rates — tracked separately
- Order numbering: `A-001, A-002...` for Branch A — `B-001, B-002...` for Branch B (auto-increment per branch)
- Order status flow: `Intake → Cutting → Sewing → Ready → Delivered`
- Payment types: `Cash` or `Card` only
- One customer can have **multiple active orders** simultaneously
- Each order stores **its own measurements** (not just a reference to customer measurements)

### Roles & Permissions
| Role            | Scope        | Can do |
|-----------------|--------------|--------|
| Admin           | All branches | Everything — employees, rates, reports, backup, settings |
| Manager         | Own branch   | Orders, tasks, branch reports. Cannot see other branches or settings |
| Reception       | Own branch   | Add customers, create orders, print invoices. Cannot see wages or reports |
| Tailor / Cutter | Own tasks    | See and update only tasks assigned to them. Cannot see prices or customer data |

### Architecture
- All DB access through `/src/db/` layer only — renderer never touches SQLite directly
- Renderer ↔ Main communication via Electron IPC only
- Every order creation/update must use a DB transaction
- **MVP: Offline-first, no sync between branches.** Sync is a post-MVP feature.
- Each branch runs its own local `app.db` file

### Tech Stack (fixed)
| Layer       | Technology               |
|-------------|--------------------------|
| Desktop     | Electron.js              |
| UI          | React + TypeScript       |
| Styling     | Tailwind CSS              |
| Database    | SQLite via better-sqlite3|
| Dev tooling | electron-vite            |
| Packaging   | electron-builder         |
| Forms       | react-hook-form          |
| Printing    | react-to-print           |
| Dates       | date-fns                 |
| Email       | nodemailer               |

---

## Database Schema (Full)

```sql
branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar TEXT,
  name_en TEXT,
  prefix TEXT UNIQUE,       -- 'A' or 'B'
  last_sequence INTEGER DEFAULT 0,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

users (
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

customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  branch_id INTEGER REFERENCES branches(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

order_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
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

customer_measurement_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  label TEXT,
  chest REAL,
  waist REAL,
  hips REAL,
  length REAL,
  sleeve REAL,
  shoulder REAL,
  notes TEXT
)

orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  branch_id INTEGER REFERENCES branches(id),
  customer_id INTEGER REFERENCES customers(id),
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

order_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
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

worker_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  piece_type TEXT NOT NULL,
  wage_type TEXT NOT NULL CHECK(wage_type IN ('percentage','fixed')),
  rate REAL NOT NULL,
  season_start DATE,
  season_end DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) UNIQUE,
  generated_at DATETIME,
  printed_at DATETIME,
  sent_via_whatsapp INTEGER DEFAULT 0
)
```

---

## Production Workflow

```
[Reception creates order]
        ↓  status: intake
[Manager assigns Cutter → task: cutting created]
        ↓  task: cutting → in_progress
[Cutter marks task done]
        ↓  task: cutting → done
[Manager assigns Tailor → task: sewing created]
        ↓  task: sewing → in_progress
[Tailor marks task done]
        ↓  task: sewing → done → order status: ready
[Customer collects, pays balance]
        ↓  order status: delivered | invoice generated | wages locked
```

**Wage calculation at task creation:**
```
Priority: seasonal rate > standard rate > error (block if none)

wage_amount =
    price × (rate / 100)   if wage_type = 'percentage'
    rate                    if wage_type = 'fixed'

Wage is stored and frozen at task creation.
Reassigning a worker recalculates from current rates.
```

---

## Spec Kit Phases

### Phase 0 — Admin Setup (Day 0, before any phase spec)

**Who does this:** Admin, on first launch.
**Why it must come first:** No orders can be created without workers, rates, and user accounts.

**Setup sequence:**
1. Create Branch A and Branch B
2. Create user accounts for all employees
3. Set worker rates per piece type
4. Optionally configure piece type list

### Phase 1 — Foundation: DB, Auth, Shell, Dashboard

- Electron shell with sidebar navigation (role-filtered)
- Login screen: username + password
- Full schema + seed data
- Auth & roles (admin, manager, reception, worker)
- Admin setup screens (users, worker rates, branches)
- Dashboard (role-aware)

### Phase 2 — Customers, Measurements, Orders

- Customer CRUD with Arabic + English search
- Per-order measurements
- Order creation with auto-numbering and balance calculation
- Order tracking with status filters

### Phase 3 — Production Tasks & Worker Wages

- Task assignment (cutting, sewing)
- Worker task view
- Wage auto-calculation and freezing
- Reassignment with recalculation

### Phase 4 — Invoice & Printing

- Bilingual invoice layout
- 80mm thermal print
- WhatsApp share
- Logo upload

### Phase 5 — Reports, Backup, Polish

- Reports (daily/weekly/monthly)
- Backup & restore
- Settings (SMTP, shop name, logo)
- Polish (overdue badges, empty states, loading skeletons)

---

## Open Decisions (resolve before Phase 3)

| # | Question | Default if not decided |
|---|----------|------------------------|
| 1 | Base salary: tracked in system or external? | Track in system (monthly report) |
| 2 | Can Reception see order prices? | Yes — needed for invoice |
| 3 | Custom piece types by admin? | Yes — `piece_types` table, admin-managed |
| 4 | Branch sync / central reporting? | Post-MVP, not in this plan |
| 5 | Notification when order becomes ready? | In-app badge only (no SMS/email) |

---

## Project Folder Structure

```
etiquette-tailor/
├── PLAN.md                        ← this file
├── CLAUDE.md
├── specs/                         ← Spec Kit specs per phase
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   └── ipc/
│   │       ├── auth.ts
│   │       ├── orders.ts
│   │       ├── tasks.ts
│   │       ├── workers.ts
│   │       └── reports.ts
│   ├── renderer/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── MyTasks.tsx
│   │   │   ├── Workers.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Invoice.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── TaskPanel.tsx
│   │   │   └── RoleGuard.tsx
│   │   └── App.tsx
│   └── db/
│       ├── schema.ts
│       ├── seed.ts
│       ├── auth.ts
│       ├── customers.ts
│       ├── orders.ts
│       ├── tasks.ts
│       ├── workers.ts
│       └── reports.ts
├── design/                        ← Stitch HTML reference files
│   ├── design-system.md
│   ├── 01-dashboard.html
│   ├── 02-customers.html
│   └── ... (11 screens total)
├── package.json
└── electron-builder.yml
```

---

*Etiquette Tailor — PLAN.md v2 | Spec Kit + Claude Code*
*Covers: multi-role auth, task-based production tracking, dual-worker wages, per-order measurements, offline-first branches*
