import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mstyccuqvedtrceuyqqa.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdHljY3VxdmVkdHJjZXV5cXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDIwNjEsImV4cCI6MjA5NTExODA2MX0.YQhk_CqLbb7t_q9WWEhrxQlZJY9Gq78qN2CnGCyztIY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SyncLogEntry {
  id?: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  branch_id: number;
  synced: number;
  created_at: string;
}

export interface SupabaseCustomer {
  id?: number;
  local_id: number;
  name: string | null;
  phone: string;
  notes: string | null;
  branch_id: number;
  created_at: string;
  updated_at: string;
  sync_source: string;
}

export interface SupabaseOrder {
  id?: number;
  local_id: number;
  order_number: string;
  branch_id: number;
  customer_id: number;
  piece_type: string;
  details: string | null;
  price: number;
  paid: number;
  payment_method: string;
  status: string;
  receive_date: string | null;
  delivery_date: string | null;
  created_by: number | null;
  fabric_source: string;
  created_at: string;
  updated_at: string;
  sync_source: string;
}

export interface SupabaseOrderItem {
  id?: number;
  local_id: number;
  order_id: number;
  piece_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fabric_source: string;
  fabric_price: number;
  details: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sync_source: string;
}

export interface SupabaseOrderPayment {
  id?: number;
  local_id: number;
  order_id: number;
  amount: number;
  method: string;
  note: string | null;
  created_by: number | null;
  created_at: string;
  sync_source: string;
}

export interface SupabaseOrderMeasurement {
  id?: number;
  local_id: number;
  order_id: number;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  length: number | null;
  sleeve: number | null;
  shoulder: number | null;
  notes: string | null;
  taken_by: number | null;
  created_at: string;
  sync_source: string;
}

export interface SupabaseOrderTask {
  id?: number;
  local_id: number;
  order_id: number;
  order_item_id: number | null;
  task_type: string;
  assigned_to: number | null;
  wage_type: string;
  wage_rate: number;
  wage_amount: number;
  task_quantity: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  sync_source: string;
}

export interface SupabaseExpense {
  id?: number;
  local_id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  branch_id: number;
  created_by: number | null;
  note: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  sync_source: string;
}
