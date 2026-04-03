import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/I18nContext';
import StepIndicator from '../components/StepIndicator';
import CustomerPicker from '../components/CustomerPicker';
import OrderItemsForm from '../components/OrderItemsForm';
import WorkerAssigner from '../components/WorkerAssigner';
import OrderSummary from '../components/OrderSummary';

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Worker {
  id: number;
  name: string;
}

interface MeasurementData {
  chest?: number;
  waist?: number;
  hips?: number;
  length?: number;
  sleeve?: number;
  shoulder?: number;
  notes?: string;
}

interface OrderItem {
  piece_type: string;
  quantity: number;
  unit_price: number;
  fabric_source: 'customer' | 'shop';
  details: string;
}

interface ItemAssignment {
  cutter_id?: number;
  cutter_wage_type?: 'percentage' | 'fixed';
  cutter_wage_rate?: number;
  tailors: { worker_id: number; quantity: number; wage_type: 'percentage' | 'fixed'; wage_rate: number }[];
}

const STEPS = [
  { label: 'Customer', icon: 'person' },
  { label: 'Order', icon: 'shopping_bag' },
  { label: 'Workers', icon: 'group' },
  { label: 'Confirm', icon: 'check_circle' },
];

export default function WorkflowWizard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementData | undefined>();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);

  React.useEffect(() => {
    window.electronAPI.auth.getSession().then((s: any) => setSession(s));
    window.electronAPI.workers.getAll().then((w: any[]) => setWorkers(w.filter(x => x.active === 1)));
  }, []);

  const handleCustomerSelect = useCallback(async (cId: number, measurementsData?: MeasurementData) => {
    setCustomerId(cId);
    setMeasurements(measurementsData);
    const allCustomers: any[] = await window.electronAPI.customers.getAll();
    const found = allCustomers.find((c: any) => c.id === cId);
    if (found) setCustomerData({ id: found.id, name: found.name, phone: found.phone || '' });
    setStep(1);
  }, []);

  const handleOrderConfirm = useCallback((orderItems: OrderItem[], delDate: string, payMethod: 'cash' | 'card') => {
    setItems(orderItems);
    setDeliveryDate(delDate);
    setPaymentMethod(payMethod);
    setStep(2);
  }, []);

  const handleWorkerConfirm = useCallback((workerAssignments: ItemAssignment[]) => {
    setAssignments(workerAssignments);
    setStep(3);
  }, []);

  const handleSubmit = useCallback(async (initialPayment: number) => {
    if (!session || !customerId || items.length === 0) return;
    setSubmitting(true);

    try {
      const payload = {
        branch_id: session.branch_id,
        customer_id: customerId,
        created_by: session.userId,
        payment_method: paymentMethod,
        delivery_date: deliveryDate,
        receive_date: new Date().toISOString().split('T')[0],
        items: items.map((item, idx) => ({
          ...item,
          cutter_id: assignments[idx]?.cutter_id,
          cutter_wage_type: assignments[idx]?.cutter_wage_type,
          cutter_wage_rate: assignments[idx]?.cutter_wage_rate,
          tailors: assignments[idx]?.tailors || [],
        })),
        measurements: measurements,
        initial_payment: initialPayment > 0 ? {
          amount: initialPayment,
          method: paymentMethod,
          note: 'Initial payment',
        } : undefined,
      };

      const result = await window.electronAPI.orders.createWithTasks(payload);
      navigate(`/orders/${result.orderId}`);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('Failed to create order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [session, customerId, items, assignments, measurements, deliveryDate, paymentMethod, navigate, t]);

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('New Order')}</h1>
        <p className="text-secondary text-sm">{t('Create order, assign workers, and record payment in one flow.')}</p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)] p-6 md:p-8">
        <div className="mb-8 px-2">
          <StepIndicator
            steps={STEPS}
            current={step}
            onStepClick={(s) => { if (s < step) setStep(s); }}
          />
        </div>

        {step === 0 && (
          <CustomerPicker
            branchId={session?.branch_id || 1}
            t={t}
            onSelect={handleCustomerSelect}
            selectedCustomerId={customerId}
          />
        )}

        {step === 1 && (
          <OrderItemsForm
            branchId={session?.branch_id || 1}
            t={t}
            onConfirm={handleOrderConfirm}
            onBack={() => setStep(0)}
            initialItems={items.length > 0 ? items : undefined}
            initialDeliveryDate={deliveryDate}
            initialPaymentMethod={paymentMethod}
          />
        )}

        {step === 2 && (
          <WorkerAssigner
            items={items}
            t={t}
            onConfirm={handleWorkerConfirm}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && customerData && (
          <OrderSummary
            customer={customerData}
            workers={workers}
            items={items}
            assignments={assignments}
            measurements={measurements}
            deliveryDate={deliveryDate}
            paymentMethod={paymentMethod}
            t={t}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
