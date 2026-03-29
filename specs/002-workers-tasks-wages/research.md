# Research: Workers, Tasks & Wage Calculation

**Branch**: `002-workers-tasks-wages` | **Date**: 2026-03-29

## Decision 1: Order Detail Page Architecture

**Decision**: Single page with tabbed sections (Details, Measurements, Tasks) rather than separate sub-pages.

**Rationale**: The existing app uses single-page layouts for Customers and Orders. A tabbed approach within Order Detail keeps context visible while allowing focused editing. Avoids deep nesting in the route structure.

**Alternatives considered**:
- Separate /orders/:id/measurements and /orders/:id/tasks pages — rejected because it fragments the order view and requires more navigation clicks
- Accordion-based sections — rejected because tabs are more familiar and match the existing Orders page filter pattern

## Decision 2: Worker Role Route Access

**Decision**: Add `/my-tasks` (for tailors) and `/cutting-queue` (for cutters) as dedicated routes. Dynamically determine which to show based on `session.worker_type`.

**Rationale**: The existing `ROLE_ROUTES` in App.tsx maps role → allowed paths. Adding worker-type-specific routes requires checking both `role` and `worker_type` from the session. Both tailor and cutter have `role: 'worker'`, so the route guard must inspect `worker_type`.

**Alternatives considered**:
- Single `/my-work` page that adapts based on worker_type — rejected because the UX is fundamentally different (task list vs queue)
- Using the existing `/dashboard` as the worker's only view — rejected because PLAN.md specifies separate My Tasks / Cutting Queue pages

## Decision 3: Monthly Wage Calculation Approach

**Decision**: Compute on-demand from `order_tasks` table using the existing `getWorkerEarnings` function. Add a date selector in the Workers page that calls this function.

**Rationale**: The `getWorkerEarnings` function already exists in `workers.ts` and queries completed tasks by date range. No need for a separate wage ledger table. The Workers page already shows worker cards — add an expandable earnings section.

**Alternatives considered**:
- Pre-computed wage table — rejected because it adds schema complexity and requires triggers or scheduled jobs
- Separate Wages page — rejected because it fragments the worker management experience

## Decision 4: Seasonal Rate UI

**Decision**: Add collapsible date range fields below each rate row on the WorkerPayRates page. When dates are set, the row shows a "Seasonal" badge.

**Rationale**: The existing WorkerPayRates page already has rate rows per piece type with toggle and rate input. Adding date fields inline keeps the context together. The `setWorkerRate` function already accepts `season_start` and `season_end`.

**Alternatives considered**:
- Separate seasonal rates tab — rejected because it disconnects rates from their piece types
- Modal for seasonal setup — rejected as unnecessary complexity for two date fields

## Decision 5: Task Board Layout

**Decision**: Table-based layout with status chips and filter controls (not Kanban columns). Sortable by due date, filterable by branch/worker/type.

**Rationale**: Kanban columns require drag-and-drop which adds complexity and a new dependency. A filterable table matches the existing Orders page pattern and is simpler to implement. The task count is small enough that a table is efficient.

**Alternatives considered**:
- Kanban board with drag-and-drop columns — rejected for complexity and no approved drag library
- Card grid — rejected because table format aligns with existing Orders page UX
