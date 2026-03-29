import db from './connection';

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  address?: string;
  branch: 'A' | 'B';
  is_deleted?: number;
  created_at?: string;
  updated_at?: string;
}

export function getAllCustomers(): Customer[] {
  const stmt = db.prepare('SELECT * FROM customers WHERE is_deleted = 0 ORDER BY created_at DESC');
  return stmt.all() as Customer[];
}

export function getCustomer(id: number): Customer | undefined {
  const stmt = db.prepare('SELECT * FROM customers WHERE id = ? AND is_deleted = 0');
  return stmt.get(id) as Customer | undefined;
}

export function createCustomer(customer: Customer): number {
  const stmt = db.prepare(`
    INSERT INTO customers (name, phone, address, branch)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(customer.name, customer.phone || null, customer.address || null, customer.branch);
  return result.lastInsertRowid as number;
}

export function updateCustomer(id: number, customer: Partial<Customer>): void {
  const stmt = db.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, address = ?, branch = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);
  stmt.run(customer.name, customer.phone || null, customer.address || null, customer.branch, id);
}

export function deleteCustomer(id: number): void {
  const stmt = db.prepare('UPDATE customers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}
