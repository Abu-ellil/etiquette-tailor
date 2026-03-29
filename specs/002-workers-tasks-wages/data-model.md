# Data Model: Workers, Tasks & Wage Calculation

**Branch**: `002-workers-tasks-wages` | **Date**: 2026-03-29

## Existing Entities (No Schema Changes)

### Order Task (`order_tasks`)
```
id              INTEGER PRIMARY KEY
order_id        INTEGER → orders.id
task_type       TEXT (cutting | sewing | design)
assigned_to     INTEGER → users.id (nullable)
wage_type       TEXT (percentage | fixed)
wage_rate       REAL
wage_amount     REAL (auto-calculated)
status          TEXT (pending | in_progress | done)
started_at      TEXT (ISO datetime, nullable)
completed_at    TEXT (ISO datetime, nullable)
notes           TEXT (nullable)
```

**State Transitions**:
```
pending → in_progress → done
  ↑                      |
  └── (reassign resets)──┘
```

### Worker Rate (`worker_rates`)
```
id              INTEGER PRIMARY KEY
user_id         INTEGER → users.id
piece_type      TEXT
wage_type       TEXT (percentage | fixed)
rate            REAL
season_start    TEXT (ISO date, nullable)
season_end      TEXT (ISO date, nullable)
created_at      TEXT
```

**Rate Selection Logic**:
```
1. Check seasonal rate: WHERE season_start <= today AND season_end >= today
2. Fall back to standard: WHERE season_start IS NULL
3. If no rate found → block task creation with warning
```

### Worker/User (`users` — workers subset)
```
id              INTEGER PRIMARY KEY
name            TEXT
username        TEXT
password_hash   TEXT
role            TEXT (worker)
worker_type     TEXT (tailor | cutter | designer, nullable)
branch_id       INTEGER → branches.id
base_salary     REAL
active          INTEGER (1 | 0)
```

## Computed Entities (No Table)

### Worker Earnings (per month)
```
worker_id       INTEGER
month           TEXT (YYYY-MM)
task_count      INTEGER (count of completed tasks)
piece_earnings  REAL (sum of wage_amount from completed tasks)
fixed_salary    REAL (from user.base_salary)
total_earnings  REAL (piece_earnings + fixed_salary)
```

### Task Board View (joined query)
```
task_id         INTEGER
order_number    TEXT
customer_name   TEXT
piece_type      TEXT
task_type       TEXT (cutting | sewing | design)
worker_name     TEXT
wage_amount     REAL
status          TEXT
due_date        TEXT
is_overdue      BOOLEAN (due_date < today AND status != done)
branch_id       INTEGER
```

## Validation Rules

1. Task creation: If no rate exists for (worker, piece_type) → block with warning
2. Wage calculation: `percentage` → price × (rate / 100); `fixed` → rate value
3. Seasonal rate priority: seasonal wins over standard during date range
4. Price change after task creation: prompt to recalculate wages for non-done tasks
5. Worker deactivation with active tasks: tasks remain, show "Worker Inactive" badge
6. Role visibility: Tailor/Cutter see no price/wage data
