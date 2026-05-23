// أنواع بيانات الطلبات

export type OrderStatus = 'intake' | 'cutting' | 'sewing' | 'ready' | 'delivered'
export type PaymentMethod = 'cash' | 'card'
export type FabricSource = 'customer' | 'shop'

export interface OrderItem {
  id?: number
  local_id?: number
  order_id?: number
  piece_type: string
  quantity: number
  unit_price: number
  total_price: number
  fabric_source: FabricSource
  fabric_price: number
  details?: string
  sort_order?: number
}

export interface OrderMeasurement {
  id?: number
  order_id?: number
  chest?: number
  waist?: number
  hips?: number
  length?: number
  sleeve?: number
  shoulder?: number
  notes?: string
  taken_by?: number
}

export interface OrderTask {
  id?: number
  order_id?: number
  order_item_id?: number
  task_type: 'cutting' | 'sewing' | 'design'
  assigned_to?: number
  wage_type: 'percentage' | 'fixed'
  wage_rate: number
  wage_amount: number
  task_quantity: number
  status: 'pending' | 'in_progress' | 'done'
  started_at?: string
  completed_at?: string
  notes?: string
}

export interface OrderPayment {
  id?: number
  order_id?: number
  amount: number
  method: PaymentMethod
  note?: string
  created_by?: number
  created_at?: string
}

export interface Order {
  id?: number
  local_id?: number
  order_number: string
  branch_id: number
  customer_id: number
  piece_type?: string
  details?: string
  price: number
  paid: number
  payment_method?: PaymentMethod
  status: OrderStatus
  receive_date?: string
  delivery_date?: string
  created_by?: number
  fabric_source?: FabricSource
  created_at?: string
  updated_at?: string
  // العلاقات
  customer?: Customer
  items?: OrderItem[]
  measurements?: OrderMeasurement
  tasks?: OrderTask[]
  payments?: OrderPayment[]
}

export interface Customer {
  id: number
  name: string
  phone: string
  notes?: string
  branch_id: number
}

export interface CreateOrderInput {
  order_number: string
  branch_id: number
  customer_id: number
  details?: string
  price: number
  paid: number
  payment_method?: PaymentMethod
  status: OrderStatus
  receive_date?: string
  delivery_date?: string
  fabric_source?: FabricSource
  items?: Omit<OrderItem, 'id' | 'order_id' | 'local_id'>[]
  measurements?: Omit<OrderMeasurement, 'id' | 'order_id' | 'local_id'>
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  intake: 'استلام',
  cutting: 'قص',
  sewing: 'خياطة',
  ready: 'جاهز',
  delivered: 'تم التسليم',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  intake: 'bg-gray-100 text-gray-800',
  cutting: 'bg-blue-100 text-blue-800',
  sewing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
}
