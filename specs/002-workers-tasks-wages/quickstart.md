# Quickstart: Workers, Tasks & Wage Calculation

**Branch**: `002-workers-tasks-wages` | **Date**: 2026-03-29

## Prerequisites

- App running via `npm run dev`
- Database initialized with schema and seed data
- At least 2 workers created (one tailor, one cutter) with rates configured
- At least 2 orders created with tasks

## Test Scenarios

### Scenario 1: Order Detail with Task Management
1. Navigate to Orders page
2. Click on an order number → Order Detail page opens
3. Verify all order fields display correctly
4. Click "Add Task" → select task type "cutting", select a worker
5. Verify wage auto-calculates based on worker's rate
6. Save the task → task appears in the task list
7. Click status button on the task → status changes pending → in_progress → done

### Scenario 2: Tailor My Tasks
1. Log out and log in as a worker with worker_type "tailor"
2. Verify sidebar shows only: Dashboard, My Tasks
3. Navigate to "My Tasks"
4. Verify only tasks assigned to this worker appear
5. Verify no prices or wages visible
6. Click "Start" on a pending task → status becomes in_progress
7. Click "Done" → status becomes done

### Scenario 3: Cutter Cutting Queue
1. Log out and log in as a worker with worker_type "cutter"
2. Verify sidebar shows only: Dashboard, Cutting Queue
3. Navigate to "Cutting Queue"
4. Verify only cutting tasks appear, sorted by delivery date
5. Verify no prices or wages visible
6. Mark a task as done

### Scenario 4: Task Board (Admin)
1. Log in as admin
2. Navigate to Task Board
3. Verify all tasks from all orders appear
4. Use branch filter → only tasks from selected branch show
5. Use worker filter → only tasks for selected worker show
6. Verify overdue tasks show red badge

### Scenario 5: Seasonal Rate Override
1. Navigate to Worker Rates page
2. Select a worker
3. Enable seasonal override for a piece type
4. Set date range (e.g., today to 30 days from now)
5. Save → seasonal rate shows badge
6. Create a task with this worker and piece type → verify seasonal rate used

### Scenario 6: Monthly Wage Totals
1. Navigate to Workers page
2. Select a month from the date picker
3. Verify each worker shows earnings: tasks completed × wages + fixed salary
4. Click into details → see breakdown of task count, piece earnings, salary
