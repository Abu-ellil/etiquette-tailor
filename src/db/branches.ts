import db from './connection';

export interface Branch {
  id?: number;
  name_ar: string;
  name_en: string;
  prefix: string;
  last_sequence: number;
  address?: string;
  phone?: string;
  created_at?: string;
}

export function getAllBranches(): Branch[] {
  const stmt = db.prepare('SELECT * FROM branches ORDER BY id');
  return stmt.all() as Branch[];
}

export function getBranchById(id: number): Branch | undefined {
  const stmt = db.prepare('SELECT * FROM branches WHERE id = ?');
  return stmt.get(id) as Branch | undefined;
}
