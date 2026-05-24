import db from './connection';
import { logChange } from './supabaseSync';

const MAX_UNDO_ENTRIES = 50;

// Tables that support soft delete (is_deleted column)
const SOFT_DELETE_TABLES = new Set(['customers', 'orders', 'order_items', 'expenses']);
// Tables that use active=0 instead of is_deleted
const ACTIVE_TOGGLE_TABLES = new Set(['piece_types', 'users']);

interface UndoEntry {
  id: number;
  table_name: string;
  record_id: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  before_data: string | null;
  after_data: string | null;
  undone: number;
  created_at: string;
}

function softDeleteRow(table: string, id: number): void {
  if (ACTIVE_TOGGLE_TABLES.has(table)) {
    db.prepare(`UPDATE ${table} SET active = 0 WHERE id = ?`).run(id);
  } else if (SOFT_DELETE_TABLES.has(table)) {
    db.prepare(`UPDATE ${table} SET is_deleted = 1 WHERE id = ?`).run(id);
  } else {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }
}

function restoreRow(table: string, id: number, data: Record<string, any>): void {
  const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);

  if (ACTIVE_TOGGLE_TABLES.has(table)) {
    if (existing) {
      db.prepare(`UPDATE ${table} SET active = 1 WHERE id = ?`).run(id);
    } else {
      const cols = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      db.prepare(`INSERT INTO ${table} (id, ${cols}) VALUES (?, ${placeholders})`).run(id, ...Object.values(data));
    }
  } else if (SOFT_DELETE_TABLES.has(table)) {
    if (existing) {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE ${table} SET is_deleted = 0, ${sets} WHERE id = ?`).run(...Object.values(data), id);
    } else {
      const cols = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      db.prepare(`INSERT INTO ${table} (id, ${cols}) VALUES (?, ${placeholders})`).run(id, ...Object.values(data));
    }
  } else {
    if (!existing) {
      const cols = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      db.prepare(`INSERT INTO ${table} (id, ${cols}) VALUES (?, ${placeholders})`).run(id, ...Object.values(data));
    }
  }
}

export function recordOperation(
  tableName: string,
  recordId: number,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  beforeData: Record<string, any> | null,
  afterData: Record<string, any> | null,
  userId: number
): void {
  db.prepare(`
    INSERT INTO undo_stack (table_name, record_id, operation, before_data, after_data, undone, session_user_id)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(
    tableName,
    recordId,
    operation,
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
    userId
  );

  // Cleanup old entries
  db.prepare(`
    DELETE FROM undo_stack WHERE session_user_id = ? AND id NOT IN (
      SELECT id FROM undo_stack WHERE session_user_id = ? ORDER BY created_at DESC LIMIT ?
    )
  `).run(userId, userId, MAX_UNDO_ENTRIES);
}

export function performUndo(userId: number): { success: boolean; description?: string; error?: string } {
  const entry = db.prepare(`
    SELECT * FROM undo_stack
    WHERE session_user_id = ? AND undone = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as UndoEntry | undefined;

  if (!entry) return { success: false, error: 'Nothing to undo' };

  const before = entry.before_data ? JSON.parse(entry.before_data) : null;
  const after = entry.after_data ? JSON.parse(entry.after_data) : null;

  try {
    switch (entry.operation) {
      case 'INSERT':
        // Undo INSERT = delete the row
        softDeleteRow(entry.table_name, entry.record_id);
        logChange(entry.table_name, entry.record_id, 'DELETE');
        break;

      case 'UPDATE':
        // Undo UPDATE = restore before_data
        if (before) {
          const sets = Object.keys(before).map(k => `${k} = ?`).join(', ');
          const values = Object.values(before);
          db.prepare(`UPDATE ${entry.table_name} SET ${sets} WHERE id = ?`).run(...values, entry.record_id);
          logChange(entry.table_name, entry.record_id, 'UPDATE', before);
        }
        break;

      case 'DELETE':
        // Undo DELETE = re-insert from before_data
        if (before) {
          restoreRow(entry.table_name, entry.record_id, before);
          logChange(entry.table_name, entry.record_id, 'INSERT', before);
        }
        break;
    }

    db.prepare('UPDATE undo_stack SET undone = 1 WHERE id = ?').run(entry.id);
    return { success: true, description: `Undone ${entry.operation} on ${entry.table_name}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function performRedo(userId: number): { success: boolean; description?: string; error?: string } {
  const entry = db.prepare(`
    SELECT * FROM undo_stack
    WHERE session_user_id = ? AND undone = 1
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as UndoEntry | undefined;

  if (!entry) return { success: false, error: 'Nothing to redo' };

  const after = entry.after_data ? JSON.parse(entry.after_data) : null;

  try {
    switch (entry.operation) {
      case 'INSERT':
        // Redo INSERT = restore the row
        if (after) {
          restoreRow(entry.table_name, entry.record_id, after);
          logChange(entry.table_name, entry.record_id, 'INSERT', after);
        }
        break;

      case 'UPDATE':
        // Redo UPDATE = apply after_data
        if (after) {
          const sets = Object.keys(after).map(k => `${k} = ?`).join(', ');
          db.prepare(`UPDATE ${entry.table_name} SET ${sets} WHERE id = ?`)
            .run(...Object.values(after), entry.record_id);
          logChange(entry.table_name, entry.record_id, 'UPDATE', after);
        }
        break;

      case 'DELETE':
        // Redo DELETE = delete again
        softDeleteRow(entry.table_name, entry.record_id);
        logChange(entry.table_name, entry.record_id, 'DELETE');
        break;
    }

    db.prepare('UPDATE undo_stack SET undone = 0 WHERE id = ?').run(entry.id);
    return { success: true, description: `Redone ${entry.operation} on ${entry.table_name}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getUndoRedoState(userId: number): {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription?: string;
  redoDescription?: string;
} {
  const undoEntry = db.prepare(`
    SELECT table_name, operation FROM undo_stack
    WHERE session_user_id = ? AND undone = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { table_name: string; operation: string } | undefined;

  const redoEntry = db.prepare(`
    SELECT table_name, operation FROM undo_stack
    WHERE session_user_id = ? AND undone = 1
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { table_name: string; operation: string } | undefined;

  return {
    canUndo: !!undoEntry,
    canRedo: !!redoEntry,
    undoDescription: undoEntry ? `${undoEntry.operation} on ${undoEntry.table_name}` : undefined,
    redoDescription: redoEntry ? `${redoEntry.operation} on ${redoEntry.table_name}` : undefined,
  };
}
