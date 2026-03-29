import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  prefix: string;
  last_sequence: number;
  address: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  branch_id: number;
}

interface Worker {
  id: number;
  name: string;
  role: string;
  worker_type?: string | null;
  branch_id: number;
}

interface WorkerRate {
  id: number;
  user_id: number;
  piece_type: string;
  wage_type: 'percentage' | 'fixed';
  rate: number;
}

/* ------------------------------------------------------------------ */
/*  Piece types (must match DB CHECK constraint)                       */
/* ------------------------------------------------------------------ */
const PIECE_TYPES = [
  { value: '\u062C\u0644\u0627\u0628\u064A\u0629', label: 'Jalabiya' },
  { value: '\u0639\u0628\u0627\u064A\u0629', label: 'Abaya' },
  { value: '\u0641\u0633\u062A\u0627\u0646', label: 'Dress' },
  { value: '\u062A\u0639\u062F\u064A\u0644', label: 'Alteration' },
  { value: 'other', label: 'Other' },
];

/* ------------------------------------------------------------------ */
/*  Form data shape                                                    */
/* ------------------------------------------------------------------ */
interface OrderFormData {
  branch_id: number;
  customer_id: number;
  piece_type: string;
  details: string;
  price: number;
  paid: number;
  payment_method: 'cash' | 'card';
  worker_id: number;
  wage_type: 'percentage' | 'fixed';
  wage_rate: number;
  receive_date: string;
  delivery_date: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NewOrderPage() {
  const navigate = useNavigate();

  /* Data */
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerRates, setWorkerRates] = useState<WorkerRate[]>([]);

  /* UI state */
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedWorkerRate, setSelectedWorkerRate] = useState<WorkerRate | null>(null);

  /* Form */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    defaultValues: {
      branch_id: 1,
      customer_id: 0,
      piece_type: '\u062C\u0644\u0627\u0628\u064A\u0629',
      details: '',
      price: 0,
      paid: 0,
      payment_method: 'cash',
      worker_id: 0,
      wage_type: 'percentage',
      wage_rate: 0,
      receive_date: format(new Date(), 'yyyy-MM-dd'),
      delivery_date: '',
    },
  });

  const watchedValues = watch();
  const price = Number(watchedValues.price) || 0;
  const paid = Number(watchedValues.paid) || 0;
  const balance = price - paid;
  const wageRate = Number(watchedValues.wage_rate) || 0;
  const wageType = watchedValues.wage_type;
  const workerId = Number(watchedValues.worker_id) || 0;

  /* Calculate worker wage */
  const calculatedWage =
    wageType === 'percentage' ? price * (wageRate / 100) : wageRate;

  /* ---- Load reference data ---- */
  useEffect(() => {
    async function load() {
      try {
        const [br, wr] = await Promise.all([
          window.electronAPI.branches.getAll(),
          window.electronAPI.workers.getAll(),
        ]);
        setBranches(br);
        setWorkers(wr);
        if (br.length > 0) setValue('branch_id', br[0].id);
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    }
    load();
  }, [setValue]);

  /* ---- Customer search ---- */
  const searchCustomers = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setCustomers([]);
        return;
      }
      try {
        const results = await window.electronAPI.customers.search(q);
        setCustomers(results);
      } catch (err) {
        console.error('Customer search failed:', err);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 250);
    return () => clearTimeout(t);
  }, [customerSearch, searchCustomers]);

  /* ---- Worker rate lookup ---- */
  useEffect(() => {
    async function loadRate() {
      if (!workerId || !watchedValues.piece_type) {
        setSelectedWorkerRate(null);
        return;
      }
      try {
        const rate = await window.electronAPI.workers.getActiveRate(
          workerId,
          watchedValues.piece_type,
        );
        if (rate) {
          setSelectedWorkerRate(rate);
          setValue('wage_type', rate.wage_type);
          setValue('wage_rate', rate.rate);
        } else {
          setSelectedWorkerRate(null);
        }
      } catch {
        setSelectedWorkerRate(null);
      }
    }
    loadRate();
  }, [workerId, watchedValues.piece_type, setValue]);

  /* ---- Create new customer on the fly ---- */
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const id = await window.electronAPI.customers.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        branch_id: Number(watchedValues.branch_id),
      });
      setValue('customer_id', id);
      setShowNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setCustomerSearch(newCustomerName.trim());
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  /* ---- Submit order ---- */
  const onSubmit = async (data: OrderFormData) => {
    if (!data.customer_id) {
      alert('Please select a customer.');
      return;
    }
    if (!data.worker_id) {
      alert('Please assign a worker.');
      return;
    }
    if (!data.delivery_date) {
      alert('Please set a delivery date.');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        order_number: '',
        branch_id: Number(data.branch_id),
        customer_id: Number(data.customer_id),
        piece_type: data.piece_type,
        details: data.details || undefined,
        price: Number(data.price),
        paid: Number(data.paid),
        payment_method: data.payment_method,
        status: 'intake' as const,
        receive_date: data.receive_date || undefined,
        delivery_date: data.delivery_date,
      };

      const orderId = await window.electronAPI.orders.create(orderData);

      /* Create a sewing task for the assigned worker */
      if (data.worker_id && calculatedWage > 0) {
        await window.electronAPI.orders.createTask({
          order_id: orderId,
          task_type: 'sewing',
          assigned_to: Number(data.worker_id),
          wage_type: data.wage_type,
          wage_rate: Number(data.wage_rate),
          wage_amount: calculatedWage,
          status: 'pending',
          notes: null,
        });
      }

      navigate('/orders');
    } catch (err) {
      console.error('Failed to create order:', err);
      alert('Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Helpers ---- */
  const today = format(new Date(), 'MMMM dd, yyyy');

  return (
    <div>
      {/* ---- Header ---- */}
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-secondary text-sm uppercase tracking-[0.2em] font-semibold mb-2">
            Order Management
          </h2>
          <h1 className="text-5xl font-extrabold tracking-tight text-on-background font-headline">
            New Order
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-widest text-outline">Current Date</span>
          <span className="text-lg text-secondary font-medium">{today}</span>
        </div>
      </header>

      {/* ---- Form ---- */}
      <section className="max-w-4xl mx-auto">
        <div className="bg-surface-container-lowest p-12 rounded-2xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            {/* ---- Branch & Status ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Branch */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  Workshop Branch
                </label>
                <div className="flex gap-2">
                  {branches.map((br) => (
                    <label key={br.id} className="flex-1 cursor-pointer group">
                      <input
                        type="radio"
                        className="hidden peer"
                        value={br.id}
                        {...register('branch_id', { valueAsNumber: true })}
                      />
                      <div className="py-4 text-center rounded-lg border-2 border-transparent bg-surface-container-low peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-primary transition-all font-bold">
                        Branch {br.prefix}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  Payment Method
                </label>
                <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl">
                  {(['cash', 'card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setValue('payment_method', method)}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all capitalize ${
                        watchedValues.payment_method === method
                          ? 'bg-white shadow-sm text-primary'
                          : 'text-secondary font-semibold hover:bg-surface-container-high'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- Customer Search ---- */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                Customer Search &amp; Selection
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  search
                </span>
                <input
                  type="text"
                  className="input-field pl-12"
                  placeholder="Type to search customers by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>

              {/* Search results dropdown */}
              {customerSearch.trim() && customers.length > 0 && !watchedValues.customer_id && (
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setValue('customer_id', c.id);
                        setCustomerSearch(`${c.name}${c.phone ? ` (${c.phone})` : ''}`);
                        setCustomers([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-surface-container-high transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">
                        {c.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{c.name}</p>
                        {c.phone && <p className="text-xs text-outline">{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected customer indicator */}
              {watchedValues.customer_id > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="chip chip-progress">Customer selected</span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('customer_id', 0);
                      setCustomerSearch('');
                    }}
                    className="text-xs text-error hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Create new customer link */}
              {!showNewCustomer && (
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="text-xs text-primary font-semibold hover:underline mt-1 ml-1"
                >
                  + Create new customer
                </button>
              )}

              {/* New customer inline form */}
              {showNewCustomer && (
                <div className="mt-3 p-4 bg-surface-container-high rounded-xl space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                    New Customer
                  </p>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Phone number (optional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      className="btn-primary px-4 py-2 text-sm rounded-lg"
                    >
                      Save Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomer(false)}
                      className="px-4 py-2 text-sm text-secondary hover:bg-surface-container-high rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Piece Type & Description ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  Garment Type
                </label>
                <select className="input-field" {...register('piece_type')}>
                  {PIECE_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                Detailed Description &amp; Special Instructions
              </label>
              <textarea
                className="input-field h-28 pt-4"
                placeholder="Enter fabric details, embroidery patterns, sizing notes..."
                {...register('details')}
              />
            </div>

            {/* ---- Worker Assignment ---- */}
            <div className="space-y-6 pt-6 border-t border-surface-container-high">
              <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight font-headline">
                Worker Assignment
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Worker select */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                    Worker
                  </label>
                  <select
                    className="input-field"
                    {...register('worker_id', { valueAsNumber: true })}
                  >
                    <option value={0}>Select Worker...</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.worker_type ? ` (${w.worker_type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Wage type toggle */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                    Payment Type
                  </label>
                  <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        className="hidden peer"
                        value="percentage"
                        {...register('wage_type')}
                      />
                      <div className="py-3 text-center rounded-lg bg-transparent text-secondary font-semibold peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-primary transition-all">
                        Percentage
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        className="hidden peer"
                        value="fixed"
                        {...register('wage_type')}
                      />
                      <div className="py-3 text-center rounded-lg bg-transparent text-secondary font-semibold peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-primary transition-all">
                        Fixed Amount
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                {/* Rate / Amount */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                    Amount / Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder={wageType === 'percentage' ? 'e.g. 18' : 'e.g. 50.00'}
                    {...register('wage_rate', { valueAsNumber: true })}
                  />
                  <p className="text-[11px] text-outline ml-1">
                    {selectedWorkerRate
                      ? `Auto-loaded from worker rate card`
                      : 'Worker payment is calculated automatically'}
                  </p>
                </div>

                {/* Calculated wage display */}
                <div className="bg-primary-container/10 border-2 border-primary-container/30 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold mb-1">
                    Calculated Worker Payment
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-primary">
                      {calculatedWage.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      QAR
                    </span>
                    {wageType === 'percentage' && wageRate > 0 && (
                      <span className="text-xs text-outline italic">
                        Worker Pay: {price.toLocaleString()} x {wageRate}% ={' '}
                        {calculatedWage.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Financials ---- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-surface-container-low rounded-2xl">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  Total Price (QAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full h-14 bg-surface-container-lowest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 font-bold text-xl text-on-surface px-4 rounded-t-lg outline-none"
                  {...register('price', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  Amount Paid (QAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full h-14 bg-surface-container-lowest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 font-bold text-xl text-on-surface px-4 rounded-t-lg outline-none"
                  {...register('paid', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  Balance Due (QAR)
                </label>
                <div
                  className={`w-full h-14 bg-surface-container-high border-b-2 font-bold text-xl px-4 rounded-t-lg flex items-center ${
                    balance > 0
                      ? 'border-error text-error'
                      : 'border-tertiary-fixed text-tertiary'
                  }`}
                >
                  {balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {/* ---- Dates ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  Received Date
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                    calendar_today
                  </span>
                  <input type="date" className="input-field pr-12" {...register('receive_date')} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  Estimated Delivery Date
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                    event_upcoming
                  </span>
                  <input
                    type="date"
                    className="input-field pr-12 border-b-primary"
                    {...register('delivery_date', { required: 'Delivery date is required' })}
                  />
                </div>
                {errors.delivery_date && (
                  <p className="text-xs text-error ml-1">{errors.delivery_date.message}</p>
                )}
              </div>
            </div>

            {/* ---- Actions ---- */}
            <div className="pt-8 flex flex-col md:flex-row gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-20 text-white rounded-xl font-headline font-extrabold text-xl shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)',
                }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="px-12 h-20 bg-surface-container-high text-secondary rounded-xl font-headline font-bold hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ---- Context Cards ---- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-tertiary-container">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">Branches</p>
            <p className="font-bold text-on-surface">{branches.length} Active</p>
            <p className="text-sm text-outline">
              {branches.map((b) => `Branch ${b.prefix}`).join(' & ')}
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-primary">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">Workers</p>
            <p className="font-bold text-on-surface">{workers.length} Available</p>
            <p className="text-sm text-outline">
              {workers
                .slice(0, 3)
                .map((w) => w.name)
                .join(', ')}
              {workers.length > 3 ? ` +${workers.length - 3} more` : ''}
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">Quick Note</p>
            <p className="font-bold text-on-surface">Balance Auto-Calculated</p>
            <p className="text-sm text-outline">Balance = Price - Paid</p>
          </div>
        </div>
      </section>
    </div>
  );
}
