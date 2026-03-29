import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

interface OrderItem {
  piece_type: string;
  piece_type_ar?: string;
  details?: string;
  price: number;
}

interface OrderData {
  id: number;
  order_number: string;
  customer_name: string;
  customer_name_ar?: string;
  created_at: string;
  due_date: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  payment_type: string;
}

// Fallback mock data used when the order cannot be loaded
const MOCK_ORDER: OrderData = {
  id: 1,
  order_number: 'A-0102',
  customer_name: 'Fatima Al-Rashid',
  customer_name_ar: 'فاطمة الراشد',
  created_at: '2024-10-24',
  due_date: '2024-11-05',
  items: [
    { piece_type: 'Bespoke Abaya', piece_type_ar: 'عباية تفصيل', details: 'Premium Silk / Black', price: 2450.0 },
    { piece_type: 'Evening Dress Alteration', piece_type_ar: 'تعديل فستان سهرة', price: 350.0 },
  ],
  subtotal: 2800.0,
  discount: 0,
  total: 2800.0,
  paid: 1000.0,
  balance: 1800.0,
  payment_type: 'Cash',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        if (id && window.electronAPI?.orders?.get) {
          const data = await window.electronAPI.orders.get(Number(id));
          if (data) {
            // Map DB fields to our local shape
            const balance = (data.price ?? data.total ?? 0) - (data.paid ?? 0);
            setOrder({
              id: data.id,
              order_number: data.order_number ?? `A-${String(data.id).padStart(4, '0')}`,
              customer_name: data.customer_name ?? data.customerName ?? '',
              customer_name_ar: data.customer_name_ar ?? '',
              created_at: data.created_at ?? data.createdAt ?? '',
              due_date: data.due_date ?? data.dueDate ?? '',
              items: data.items ?? [
                { piece_type: data.piece_type ?? data.pieceType ?? 'Tailoring Service', price: data.price ?? 0 },
              ],
              subtotal: data.subtotal ?? data.price ?? 0,
              discount: data.discount ?? 0,
              total: data.total ?? data.price ?? 0,
              paid: data.paid ?? 0,
              balance,
              payment_type: data.payment_type ?? data.paymentType ?? 'Cash',
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to mock
      }
      setOrder(MOCK_ORDER);
      setLoading(false);
    }
    fetchOrder();
  }, [id]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-secondary">Loading invoice...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="material-symbols-outlined text-5xl text-error">receipt_long</span>
        <p className="text-secondary">Order not found.</p>
        <button onClick={() => navigate(-1)} className="btn-primary text-sm">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Action Toolbar (hidden when printing) */}
      <div className="no-print w-full max-w-[400px] mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline text-xl font-bold">Preview Invoice</h2>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
          onClick={() => handlePrint()}
        >
          <span className="material-symbols-outlined text-sm">print</span>
          <span className="text-sm font-semibold">Print Receipt</span>
        </button>
      </div>

      {/* Thermal Receipt Container */}
      <div className="flex justify-center">
        <div
          ref={printRef}
          className="w-full max-w-[380px] bg-surface-container-lowest p-8 shadow-2xl relative border-t-8 border-primary overflow-hidden"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-3">
              <span
                className="material-symbols-outlined text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                straighten
              </span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tighter uppercase">
              Etiquette Tailor
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-secondary font-semibold uppercase">
              Premium Bespoke Atelier
            </p>
          </div>

          {/* Order Identifier */}
          <div className="border-y border-dashed border-outline-variant py-4 mb-6 flex flex-col items-center gap-1">
            <div className="text-[10px] text-secondary font-bold uppercase tracking-widest">
              Order Identifier
            </div>
            <div className="text-3xl font-headline font-black text-primary tracking-tighter">
              #{order.order_number}
            </div>
          </div>

          {/* Dates and Customer */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-start border-b border-surface-container pb-2">
              <div className="text-xs">
                <p className="text-secondary font-bold uppercase text-[9px]">Receipt Date</p>
                <p className="font-semibold">{formatDate(order.created_at)}</p>
              </div>
              <div className="text-xs text-right">
                <p className="text-secondary font-bold uppercase text-[9px]">Delivery Date</p>
                <p className="font-semibold text-primary">{formatDate(order.due_date)}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-secondary font-bold uppercase text-[9px] mb-1">Customer Details</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">{order.customer_name}</span>
                {order.customer_name_ar && (
                  <span
                    className="font-bold text-base leading-none"
                    style={{ fontFamily: "'Noto Sans Arabic', sans-serif", direction: 'rtl' }}
                  >
                    {order.customer_name_ar}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <div className="flex justify-between text-[10px] font-black uppercase text-secondary mb-2 border-b-2 border-on-surface pb-1">
              <span>Description / الوصف</span>
              <span>Amount</span>
            </div>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex flex-col">
                    <span className="font-bold">{item.piece_type}</span>
                    {item.piece_type_ar && (
                      <span
                        className="text-xs text-secondary"
                        style={{ fontFamily: "'Noto Sans Arabic', sans-serif", direction: 'rtl' }}
                      >
                        {item.piece_type_ar}
                      </span>
                    )}
                    {item.details && (
                      <span className="text-[10px] text-secondary mt-1">{item.details}</span>
                    )}
                  </div>
                  <span className="font-headline font-bold">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financials */}
          <div className="bg-surface-container-low p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-secondary font-medium">Subtotal / المجموع</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">Discount / خصم</span>
                <span className="font-semibold text-error">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-primary">
              <span className="font-bold uppercase tracking-tighter">Amount Paid / المدفوع</span>
              <span className="font-black">{formatCurrency(order.paid)}</span>
            </div>
            <div className="pt-3 mt-2 border-t-2 border-on-surface flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                  Balance Due
                </p>
                <p
                  className="text-[10px] font-bold"
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif", direction: 'rtl' }}
                >
                  الرصيد المتبقي
                </p>
              </div>
              <div className="text-2xl font-headline font-black tracking-tight text-on-surface">
                {formatCurrency(order.balance)}{' '}
                <span className="text-xs font-medium ml-1">QAR</span>
              </div>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex flex-col items-center my-8">
            <div className="w-24 h-24 border border-outline-variant p-1 bg-surface-container-lowest flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-secondary">qr_code_2</span>
            </div>
            <p className="text-[8px] mt-2 text-secondary uppercase font-bold tracking-widest">
              Scan to track order status
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center pt-6 border-t border-dashed border-outline-variant">
            <p className="font-headline font-bold text-sm mb-1 italic">Thank You for your trust!</p>
            <p
              className="font-bold text-sm mb-4"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif", direction: 'rtl' }}
            >
              شكراً لثقتكم بنا
            </p>
            <div className="space-y-1 text-[9px] text-secondary font-medium uppercase tracking-tighter">
              <p>Building 4, Design District, Dubai, UAE</p>
              <p>Tel: +971 4 555 1234 &bull; WhatsApp: +971 50 123 4567</p>
              <p>www.etiquettetailor.ae</p>
            </div>
          </footer>

          {/* Cut Line Graphic (screen only) */}
          <div className="no-print absolute bottom-0 left-0 w-full flex justify-around opacity-20 pointer-events-none">
            <span className="material-symbols-outlined text-4xl">content_cut</span>
            <span className="material-symbols-outlined text-4xl">content_cut</span>
            <span className="material-symbols-outlined text-4xl">content_cut</span>
          </div>
        </div>
      </div>
    </div>
  );
}
