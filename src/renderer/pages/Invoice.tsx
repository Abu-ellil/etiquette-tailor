import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/I18nContext';

interface OrderItem {
  piece_type: string;
  piece_type_ar?: string;
  details?: string;
  price: number;
  quantity?: number;
}

interface OrderData {
  id: number;
  order_number: string;
  customer_name: string;
  customer_name_ar?: string;
  customer_phone?: string;
  created_at: string;
  due_date: string;
  receive_date?: string;
  delivery_date?: string;
  piece_type: string;
  details?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  payment_method: string;
  status: string;
  worker_name?: string;
}

interface ShopSettings {
  shop_name_ar?: string;
  shop_name_en?: string;
  shop_phone?: string;
  receipt_footer?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, currency } = useTranslation();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [settings, setSettings] = useState<ShopSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch settings and order in parallel
        const [settingsData, orderData] = await Promise.all([
          window.electronAPI?.settings?.getAll?.() || {},
          id ? window.electronAPI?.orders?.get?.(Number(id)) : null,
        ]);

        setSettings(settingsData || {});

        if (orderData) {
          const total = orderData.price ?? orderData.total ?? 0;
          const paid = orderData.paid ?? 0;
          const balance = total - paid;

          // Fetch order items
          let items: OrderItem[] = [];
          try {
            const orderItems = await window.electronAPI?.orders?.getItems?.(orderData.id);
            if (orderItems && orderItems.length > 0) {
              items = orderItems.map((it: any) => ({
                piece_type: it.piece_type || '',
                price: it.total_price || it.unit_price || 0,
                quantity: it.quantity || 1,
              }));
            }
          } catch { /* items fetch failed, use fallback */ }

          if (items.length === 0) {
            items = [{
              piece_type: orderData.piece_type || orderData.pieceType || 'Tailoring Service',
              price: total,
            }];
          }

          // Try to get worker name from tasks
          let workerName: string | undefined;
          try {
            const tasks = await window.electronAPI?.orders?.getTasks?.(orderData.id);
            if (tasks && tasks.length > 0) {
              const workerNames = tasks
                .filter((task: any) => task.assigned_to_name || task.worker_name)
                .map((task: any) => task.assigned_to_name || task.worker_name);
              if (workerNames.length > 0) {
                workerName = [...new Set(workerNames)].join(' - ');
              }
            }
          } catch { /* tasks fetch failed */ }

          setOrder({
            id: orderData.id,
            order_number: orderData.order_number || `${String(orderData.id).padStart(4, '0')}`,
            customer_name: orderData.customer_name || orderData.customerName || '',
            customer_name_ar: orderData.customer_name_ar || '',
            customer_phone: orderData.customer_phone || orderData.customerPhone || orderData.phone || '',
            created_at: orderData.created_at || orderData.createdAt || '',
            due_date: orderData.due_date || orderData.dueDate || orderData.delivery_date || '',
            receive_date: orderData.receive_date || '',
            delivery_date: orderData.delivery_date || orderData.due_date || orderData.dueDate || '',
            piece_type: orderData.piece_type || orderData.pieceType || '',
            details: orderData.details || '',
            items,
            subtotal: total,
            discount: orderData.discount ?? 0,
            total,
            paid,
            balance,
            payment_method: orderData.payment_method || orderData.paymentMethod || 'cash',
            status: orderData.status || 'intake',
            worker_name: workerName,
          });
        }
      } catch {
        // Order not found or error loading
      }
      setOrder(prev => prev);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const handlePrint = () => window.electronAPI?.print?.receipt?.();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-secondary">{t('Loading invoice...')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="material-symbols-outlined text-5xl text-error">receipt_long</span>
        <p className="text-secondary">{t('Order not found.')}</p>
        <button onClick={() => navigate(-1)} className="btn-primary text-sm">
          {t('Go Back')}
        </button>
      </div>
    );
  }

  const shopNameAr = settings.shop_name_ar || 'إتيكيت تيلور';
  const shopNameEn = settings.shop_name_en || 'Etiquette Tailor';
  const shopPhone = settings.shop_phone || '';
  const receiptFooter = settings.receipt_footer || '';
  const isPaid = order.balance <= 0;

  return (
    <div className="pb-12">
      {/* Action Toolbar (hidden when printing) */}
      <div className="no-print w-full max-w-[400px] mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline text-xl font-bold">{t('Preview Invoice')}</h2>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
          onClick={() => handlePrint()}
        >
          <span className="material-symbols-outlined text-sm">print</span>
          <span className="text-sm font-semibold">{t('Print Receipt')}</span>
        </button>
      </div>

      {/* Thermal Receipt */}
      <div className="flex justify-center">
        <div
          className="thermal-receipt w-full max-w-[302px] bg-white text-black p-4 font-mono text-[12px] leading-relaxed"
          style={{ fontFamily: "'Courier New', 'Lucida Console', monospace" }}
        >
          {/* Header */}
          <div className="text-center mb-3">
            <div className="text-xl font-bold mb-0.5">{shopNameAr}</div>
            <div className="text-[10px] text-gray-600">{shopNameEn}</div>
            <div className="text-[11px] mt-2">
              {t('Hello')} {order.customer_name}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {t('This is your order invoice from Etiquette Tailor')}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Order Details - Two column: value | label */}
          <div className="space-y-1">
            <ReceiptRow value={order.order_number} label={t('Invoice Number / رقم الفاتورة')} />
            <ReceiptRow value={order.customer_name} label={t('Customer / العميل')} />
            {order.customer_phone && (
              <ReceiptRow value={order.customer_phone} label={t('Phone / الهاتف')} />
            )}

            {/* Divider */}
            <div className="border-t border-dotted border-gray-300 my-1" />

            {/* Items */}
            {order.items.map((item, idx) => (
              <div key={idx}>
                <ReceiptRow
                  value={item.piece_type}
                  label={item.quantity && item.quantity > 1
                    ? `${t('Service')} (${item.quantity}x)`
                    : t('Service / الخدمة')}
                />
                <ReceiptRow
                  value={`${formatCurrency(item.price)} ${t(currency)}`}
                  label={t('Price / السعر')}
                />
              </div>
            ))}

            {/* Divider */}
            <div className="border-t border-dotted border-gray-300 my-1" />

            <ReceiptRow
              value={`${formatCurrency(order.total)} ${t(currency)}`}
              label={t('Total / الإجمالي')}
              bold
            />
            <ReceiptRow
              value={`${formatCurrency(order.paid)} ${t(currency)}`}
              label={t('Paid / المدفوع')}
            />
            {order.balance > 0 && (
              <ReceiptRow
                value={`${formatCurrency(order.balance)} ${t(currency)}`}
                label={t('Balance Due / الرصيد')}
                bold
              />
            )}

            {/* Divider */}
            <div className="border-t border-dotted border-gray-300 my-1" />

            <ReceiptRow
              value={order.payment_method === 'card' ? t('Card') : t('Cash')}
              label={t('Payment / الدفع')}
            />
            <ReceiptRow
              value={formatShortDate(order.created_at)}
              label={t('Receipt Date / تاريخ')}
            />
            {order.delivery_date && (
              <ReceiptRow
                value={formatShortDate(order.delivery_date)}
                label={t('Delivery Date / التسليم')}
              />
            )}
            {order.worker_name && (
              <ReceiptRow
                value={order.worker_name}
                label={t('Worker / العامل')}
              />
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Payment Status */}
          <div className="text-center mb-2">
            {isPaid ? (
              <div className="font-bold">
                {t('Paid in Full / تم الدفع')}
              </div>
            ) : (
              <div className="font-bold">
                {t('Balance Due / الرصيد المتبقي')}: {formatCurrency(order.balance)} {t(currency)}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-600 space-y-1">
            <div className="font-bold text-[11px]">
              {t('Thank you for your trust!')}
            </div>
            <div className="font-bold text-[11px]">
              {t('Thank You for your trust!')}
            </div>
            {shopPhone && (
              <div>
                {t('For inquiries')} : {shopPhone}
              </div>
            )}
            {receiptFooter && (
              <div className="mt-1">{receiptFooter}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ value, label, bold }: { value: string; label: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className={`${bold ? 'font-bold' : ''} text-left`}>{value}</span>
      <span className={`${bold ? 'font-bold' : ''} text-right text-gray-700 whitespace-nowrap`}>{label}</span>
    </div>
  );
}
