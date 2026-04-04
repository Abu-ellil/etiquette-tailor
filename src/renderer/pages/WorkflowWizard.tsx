import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from '../contexts/I18nContext';
import StepIndicator from '../components/StepIndicator';

interface Customer { id: number; name: string; phone: string; notes: string; }
interface Worker { id: number; name: string; worker_type: string | null; active: number; }
interface PieceType { id: number; name_en: string; category: string; base_price: number; active: number; }
interface WorkerRate { wage_type: 'percentage' | 'fixed'; rate: number; }

interface MeasurementData {
  chest?: number; waist?: number; hips?: number; length?: number; sleeve?: number; shoulder?: number; notes?: string;
}

interface OrderItem {
  piece_type: string; quantity: number; unit_price: number; fabric_source: 'customer' | 'shop'; details: string;
}

interface TailorAssignment { worker_id: number; quantity: number; wage_type: 'percentage' | 'fixed'; wage_rate: number; }
interface ItemAssignment {
  cutter_id?: number; cutter_wage_type?: 'percentage' | 'fixed'; cutter_wage_rate?: number; tailors: TailorAssignment[];
}

const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' }, { key: 'waist', label: 'Waist' }, { key: 'hips', label: 'Hips' },
  { key: 'length', label: 'Length' }, { key: 'sleeve', label: 'Sleeve' }, { key: 'shoulder', label: 'Shoulder' },
];

function emptyItem(): OrderItem {
  return { piece_type: '', quantity: 1, unit_price: 0, fabric_source: 'customer', details: '' };
}

/* ─── StepCard defined OUTSIDE the component to avoid re-mount on every keystroke ─── */
interface StepCardProps {
  icon: string;
  title: string;
  currentStep: number;
  isLastStep: boolean;
  submitting: boolean;
  validationError: string | null;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
  t: (key: string) => string;
}

function StepCard({ icon, title, currentStep, isLastStep, submitting, validationError, onBack, onNext, children, t }: StepCardProps) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_4px_16px_rgba(25,28,29,0.04)] animate-fadeIn">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface">{title}</h2>
      </div>
      {children}
      {validationError && (
        <div className="bg-error-container text-on-error-container rounded-xl p-3 flex items-center gap-2 text-sm font-medium mt-5">
          <span className="material-symbols-outlined text-base">error</span>
          {t(validationError)}
        </div>
      )}
      <div className="flex gap-3 mt-6 pt-4 border-t border-outline-variant/20">
        {currentStep > 0 && (
          <button onClick={onBack} className="px-6 py-3 text-sm font-semibold text-secondary hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>{t('Back')}
          </button>
        )}
        <button onClick={onNext} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {submitting ? (
            <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>{t('Creating...')}</>
          ) : isLastStep ? (
            <><span className="material-symbols-outlined text-sm">check_circle</span>{t('Create Order')}</>
          ) : (
            <>{t('Continue')}<span className="material-symbols-outlined text-sm">arrow_forward</span></>
          )}
        </button>
      </div>
    </section>
  );
}

export default function WorkflowWizard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [session, setSession] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementData>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pieceTypes, setPieceTypes] = useState<PieceType[]>([]);
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [orderNotes, setOrderNotes] = useState('');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([{ tailors: [] }]);
  const [rateCache, setRateCache] = useState<Record<string, WorkerRate>>({});
  const [initialPayment, setInitialPayment] = useState(0);

  const { register, handleSubmit: handleCreateCustomerSubmit, reset: resetCreateForm } = useForm({ mode: 'onSubmit' as const, defaultValues: { name: '', phone: '', notes: '' } });

  useEffect(() => {
    window.electronAPI.auth.getSession().then((s: any) => setSession(s));
    window.electronAPI.workers.getAll().then((w: any[]) => setWorkers(w.filter((x: any) => x.active === 1)));
    window.electronAPI.pieceTypes.getAll().then((pt: any[]) => setPieceTypes(pt));
  }, []);

  const cutters = workers.filter(w => w.worker_type === 'master_cutter');
  const tailors = workers.filter(w => w.worker_type === 'tailor');
  const totalPrice = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
  const getWorkerName = (id: number) => workers.find(w => w.id === id)?.name || `#${id}`;

  const WIZARD_STEPS = [
    { label: t('Customer'), icon: 'person' },
    { label: t('Measurements'), icon: 'straighten' },
    { label: t('Items'), icon: 'shopping_bag' },
    { label: t('Workers'), icon: 'content_cut' },
    { label: t('Review'), icon: 'receipt' },
  ];

  const stepCardProps = {
    currentStep,
    isLastStep: currentStep === WIZARD_STEPS.length - 1,
    submitting,
    validationError,
    onBack: goBack,
    onNext: goNext,
    t,
  };

  // ─── Validation ───
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0: return selectedCustomer ? null : 'Please select or create a customer.';
      case 1: return Object.values(measurements).some(v => v !== undefined && v !== null) ? null : 'Please enter at least one measurement.';
      case 2: return items.filter(i => i.piece_type).length > 0 ? null : 'Please add at least one item.';
      case 3: {
        const validItems = items.filter(i => i.piece_type);
        if (!deliveryDate) return 'Please set a delivery date.';
        if (!validItems.every((_, idx) => assignments[idx]?.cutter_id)) return 'Please assign a cutter for each item.';
        return null;
      }
      default: return null;
    }
  };

  function goNext() {
    const error = validateStep(currentStep);
    if (error) { setValidationError(error); return; }
    setValidationError(null);
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    setValidationError(null);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      setValidationError(null);
    }
  };

  // ─── Customer search ───
  const doSearch = useCallback(async (q: string) => {
    if (q.length === 0) {
      const res = await window.electronAPI.customers.getAll();
      setCustomers(res);
    } else {
      const res = await window.electronAPI.customers.search(q);
      setCustomers(res);
    }
    setShowCustomerResults(true);
  }, []);

  const onSearchChange = (val: string) => {
    setCustomerQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 200);
  };

  const pickCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setShowCustomerResults(false);
    setShowNewCustomer(false);
  };

  const onCreateCustomer = async (data: { name: string; phone: string; notes: string }) => {
    const c = await window.electronAPI.customers.create({ name: data.name, phone: data.phone, notes: data.notes, branch_id: session?.branch_id || 1 });
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setShowNewCustomer(false);
    resetCreateForm();
  };

  // ─── Measurements ───
  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value ? parseFloat(value) : undefined }) as MeasurementData);
  };

  // ─── Items ───
  const getBasePrice = (name: string) => pieceTypes.find(p => p.name_en === name)?.base_price || 0;

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const handlePieceTypeChange = (idx: number, name: string) => {
    updateItem(idx, { piece_type: name, unit_price: getBasePrice(name) });
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyItem()]);
    setAssignments(prev => [...prev, { tailors: [] }]);
  };
  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Workers ───
  const getRate = async (workerId: number, pieceType: string): Promise<WorkerRate | null> => {
    const key = `${workerId}-${pieceType}`;
    if (rateCache[key]) return rateCache[key];
    try {
      const rate = await window.electronAPI.workers.getActiveRate(workerId, pieceType);
      if (rate) setRateCache(prev => ({ ...prev, [key]: rate }));
      return rate;
    } catch { return null; }
  };

  const handleAssignCutter = async (itemIdx: number, cutterId: number) => {
    const rate = await getRate(cutterId, items[itemIdx].piece_type);
    setAssignments(prev => prev.map((a, i) => i === itemIdx ? {
      ...a, cutter_id: cutterId, cutter_wage_type: rate?.wage_type || 'fixed', cutter_wage_rate: rate?.rate || 0,
    } : a));
  };

  const handleAddTailor = async (itemIdx: number, tailorId: number) => {
    const item = items[itemIdx];
    const rate = await getRate(tailorId, item.piece_type);
    const currentQty = assignments[itemIdx].tailors.reduce((s, tl) => s + tl.quantity, 0);
    const remaining = item.quantity - currentQty;
    if (remaining <= 0) return;
    setAssignments(prev => prev.map((a, i) => i === itemIdx ? {
      ...a, tailors: [...a.tailors, { worker_id: tailorId, quantity: Math.min(remaining, 1), wage_type: rate?.wage_type || 'fixed', wage_rate: rate?.rate || 0 }],
    } : a));
  };

  const removeTailor = (itemIdx: number, tailorIdx: number) => {
    setAssignments(prev => prev.map((a, i) => i === itemIdx ? {
      ...a, tailors: a.tailors.filter((_, ti) => ti !== tailorIdx),
    } : a));
  };

  const updateTailorQty = (itemIdx: number, tailorIdx: number, qty: number) => {
    setAssignments(prev => prev.map((a, i) => i === itemIdx ? {
      ...a, tailors: a.tailors.map((tl, ti) => ti === tailorIdx ? { ...tl, quantity: Math.max(1, qty) } : tl),
    } : a));
  };

  const calcCutterWage = (idx: number) => {
    const a = assignments[idx]; const item = items[idx];
    if (!a?.cutter_wage_rate) return 0;
    return a.cutter_wage_type === 'percentage' ? (item.unit_price * item.quantity * a.cutter_wage_rate / 100) : a.cutter_wage_rate;
  };

  const calcTailorWage = (itemIdx: number, tailorIdx: number) => {
    const a = assignments[itemIdx]; const item = items[itemIdx]; const tl = a?.tailors[tailorIdx];
    if (!tl) return 0;
    return tl.wage_type === 'percentage' ? (item.unit_price * tl.quantity * tl.wage_rate / 100) : tl.wage_rate;
  };

  // ─── Submit ───
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const validItems = items.filter(i => i.piece_type);
      const hasMeasurements = Object.values(measurements).some(v => v !== undefined && v !== null);
      const payload = {
        branch_id: session.branch_id,
        customer_id: selectedCustomer!.id,
        created_by: session.userId,
        payment_method: paymentMethod,
        delivery_date: deliveryDate,
        receive_date: new Date().toISOString().split('T')[0],
        notes: orderNotes || undefined,
        items: validItems.map((item, idx) => ({
          ...item,
          cutter_id: assignments[idx]?.cutter_id,
          cutter_wage_type: assignments[idx]?.cutter_wage_type,
          cutter_wage_rate: assignments[idx]?.cutter_wage_rate,
          tailors: assignments[idx]?.tailors || [],
        })),
        measurements: hasMeasurements ? measurements : undefined,
        initial_payment: initialPayment > 0 ? { amount: initialPayment, method: paymentMethod, note: 'Initial payment' } : undefined,
      };
      const result = await window.electronAPI.orders.createWithTasks(payload);
      navigate(`/orders/${result.orderId}`);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('Failed to create order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const sc = stepCardProps; // shorthand

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('New Order')}</h1>
        <p className="text-secondary text-sm">{t('Fill all details below, then submit.')}</p>
      </div>

      {/* Step Indicator */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0px_4px_16px_rgba(25,28,29,0.04)] mb-6">
        <StepIndicator steps={WIZARD_STEPS} current={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* ─── STEP 0: Customer ─── */}
      {currentStep === 0 && (
        <StepCard icon="person" title={t('Customer')} {...sc}>
          {!selectedCustomer ? (
            <>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                <input
                  type="text" value={customerQuery} onChange={e => onSearchChange(e.target.value)}
                  placeholder={t('Search by name or phone...')} className="input-field pl-12"
                  onFocus={() => doSearch(customerQuery)}
                  onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
                />
              </div>

              {showCustomerResults && customers.length > 0 && (
                <div className="mt-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-lg max-h-40 overflow-y-auto z-10 relative">
                  {customers.map(c => (
                    <button key={c.id} onMouseDown={() => pickCustomer(c)}
                      className="w-full text-start px-4 py-2.5 hover:bg-surface-container-high transition-colors flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">{c.name.charAt(0)}</div>
                      <div><div className="font-medium text-sm">{c.name}</div>{c.phone && <div className="text-xs text-secondary">{c.phone}</div>}</div>
                    </button>
                  ))}
                </div>
              )}

              {!showNewCustomer && customerQuery.length >= 2 && customers.length === 0 && (
                <div className="mt-3 text-center">
                  <p className="text-secondary text-sm mb-2">{t('No customer found.')}</p>
                  <button onClick={() => setShowNewCustomer(true)} className="btn-primary text-xs px-4 py-2">
                    <span className="material-symbols-outlined text-xs mr-1 align-middle">person_add</span>{t('Create New Customer')}
                  </button>
                </div>
              )}

              {showNewCustomer && (
                <form onSubmit={handleCreateCustomerSubmit(onCreateCustomer)} className="mt-4 bg-surface-container-low rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Name')}</label>
                      <input {...register('name', { required: true })} className="input-field" placeholder={t('Full name')} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Phone')}</label>
                      <input {...register('phone')} className="input-field" placeholder={t('Phone number')} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-xs py-2">{t('Create')}</button>
                    <button type="button" onClick={() => setShowNewCustomer(false)} className="text-xs text-secondary hover:text-on-surface py-2">{t('Cancel')}</button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="bg-primary-fixed/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center">{selectedCustomer.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-xs text-secondary">{selectedCustomer.phone}</div>}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); setMeasurements({}); }}
                className="text-secondary hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
        </StepCard>
      )}

      {/* ─── STEP 1: Measurements ─── */}
      {currentStep === 1 && (
        <StepCard icon="straighten" title={t('Measurements')} {...sc}>
          <p className="text-secondary text-xs mb-4">{selectedCustomer?.name} — {t('Required')}</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t(f.label)}</label>
                <input type="number" step="0.5" value={measurements[f.key as keyof MeasurementData] ?? ''}
                  onChange={e => handleMeasurementChange(f.key, e.target.value)} className="input-field text-center" placeholder="—" />
              </div>
            ))}
          </div>
        </StepCard>
      )}

      {/* ─── STEP 2: Items ─── */}
      {currentStep === 2 && (
        <StepCard icon="shopping_bag" title={t('Items')} {...sc}>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="bg-surface-container-low rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {item.piece_type || `${t('Item')} #${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.piece_type && <span className="text-sm font-bold">{(item.unit_price * item.quantity).toFixed(2)} {t('QAR')}</span>}
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-outline hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Piece')}</label>
                      <select value={item.piece_type} onChange={e => handlePieceTypeChange(idx, e.target.value)} className="input-field text-sm">
                        <option value="">{t('Select...')}</option>
                        {pieceTypes.filter(p => p.active !== 0).map(pt => (
                          <option key={pt.id} value={pt.name_en}>{pt.name_en}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Qty')}</label>
                      <input type="number" min={1} value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="input-field text-sm text-center" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Price')}</label>
                      <input type="number" step="0.01" value={item.unit_price}
                        onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Fabric')}</label>
                      <div className="flex gap-1">
                        {(['customer', 'shop'] as const).map(src => (
                          <button key={src} onClick={() => updateItem(idx, { fabric_source: src })}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors ${item.fabric_source === src ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary'}`}>
                            {src === 'customer' ? t('Customer') : t('Shop')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addItem}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-outline-variant/40 rounded-xl text-secondary hover:text-primary hover:border-primary transition-colors text-xs font-bold">
            <span className="material-symbols-outlined text-sm mr-1 align-middle">add</span>{t('Add Item')}
          </button>
        </StepCard>
      )}

      {/* ─── STEP 3: Workers & Delivery ─── */}
      {currentStep === 3 && (
        <StepCard icon="content_cut" title={t('Workers')} {...sc}>
          {/* Worker Assignments */}
          <div className="space-y-4 mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary">{t('Assign Workers')}</h3>
            {items.filter(i => i.piece_type).map((item) => {
              const origIdx = items.indexOf(item);
              const assignment = assignments[origIdx] || { tailors: [] };
              const assignedTailorQty = (assignment.tailors || []).reduce((s: number, tl: TailorAssignment) => s + tl.quantity, 0);
              const remainingQty = item.quantity - assignedTailorQty;

              return (
                <div key={origIdx} className="bg-surface-container-low rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold">{item.piece_type} × {item.quantity}</span>
                    <span className="text-xs font-bold text-primary">{(item.unit_price * item.quantity).toFixed(2)} {t('QAR')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">content_cut</span>{t('Cutter')}
                      </label>
                      <select value={assignment.cutter_id || ''} onChange={e => e.target.value && handleAssignCutter(origIdx, parseInt(e.target.value))} className="input-field text-sm">
                        <option value="">{t('Select...')}</option>
                        {cutters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {assignment.cutter_id && (
                        <span className="text-[10px] text-secondary mt-0.5 block">{calcCutterWage(origIdx).toFixed(2)} {t('QAR')}</span>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">styler</span>{t('Tailors')}
                        {item.quantity > 1 && <span className="font-normal">({assignedTailorQty}/{item.quantity})</span>}
                      </label>
                      {(assignment.tailors || []).map((tl: TailorAssignment, ti: number) => {
                        const worker = tailors.find(w => w.id === tl.worker_id);
                        return (
                          <div key={ti} className="flex items-center gap-2 mb-1.5 bg-surface-container-lowest rounded-lg px-2.5 py-1.5">
                            <span className="text-xs font-medium flex-1 truncate">{worker?.name || `#${tl.worker_id}`}</span>
                            <input type="number" min={1} max={item.quantity} value={tl.quantity}
                              onChange={e => updateTailorQty(origIdx, ti, parseInt(e.target.value) || 1)}
                              className="input-field-sm w-12 text-center" />
                            <span className="text-[10px] text-secondary">{calcTailorWage(origIdx, ti).toFixed(2)}</span>
                            <button onClick={() => removeTailor(origIdx, ti)} className="text-outline hover:text-error">
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </div>
                        );
                      })}
                      {remainingQty > 0 && (
                        <select value="" onChange={e => e.target.value && handleAddTailor(origIdx, parseInt(e.target.value))} className="input-field text-xs !h-9">
                          <option value="">{t('+ Add tailor...')}</option>
                          {tailors.filter(w => !(assignment.tailors || []).some((at: TailorAssignment) => at.worker_id === w.id)).map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      )}
                      {remainingQty <= 0 && (assignment.tailors || []).length > 0 && (
                        <span className="text-[10px] text-tertiary font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">check_circle</span>{t('All assigned')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery & Payment */}
          <div className="border-t border-outline-variant/20 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{t('Delivery & Payment')}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Delivery Date')}</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Payment')}</label>
                <div className="flex gap-1.5">
                  {(['cash', 'card'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg capitalize transition-colors ${paymentMethod === m ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary'}`}>
                      {m === 'cash' ? t('Cash') : t('Card')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Notes')}</label>
                <input type="text" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="input-field text-sm" placeholder={t('Optional')} />
              </div>
            </div>
          </div>
        </StepCard>
      )}

      {/* ─── STEP 4: Review & Submit ─── */}
      {currentStep === 4 && (
        <StepCard icon="receipt" title={t('Review')} {...sc}>
          <div className="space-y-4">
            {/* Customer summary */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{t('Customer')}</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center">{selectedCustomer?.name.charAt(0)}</div>
                <div>
                  <div className="font-semibold text-sm">{selectedCustomer?.name}</div>
                  {selectedCustomer?.phone && <div className="text-xs text-secondary">{selectedCustomer.phone}</div>}
                </div>
              </div>
            </div>

            {/* Measurements summary */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{t('Measurements')}</h3>
              <div className="flex flex-wrap gap-3">
                {MEASUREMENT_FIELDS.map(f => {
                  const val = measurements[f.key as keyof MeasurementData];
                  return val !== undefined ? (
                    <span key={f.key} className="text-xs"><span className="text-secondary">{t(f.label)}:</span> <span className="font-semibold">{val}</span></span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Items & Workers summary */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{t('Order Items')}</h3>
              <div className="space-y-2">
                {items.filter(i => i.piece_type).map((item, idx) => {
                  const a = assignments[items.indexOf(item)];
                  return (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.piece_type} × {item.quantity}</span>
                        <span className="font-bold">{(item.unit_price * item.quantity).toFixed(2)} {t('QAR')}</span>
                      </div>
                      <div className="text-secondary space-y-0.5 mt-0.5">
                        {a?.cutter_id && <div className="flex items-center gap-0.5"><span className="material-symbols-outlined" style={{fontSize:'10px'}}>content_cut</span>{getWorkerName(a.cutter_id)}</div>}
                        {(a?.tailors || []).map((tl: TailorAssignment, ti: number) => (
                          <div key={ti} className="flex items-center gap-0.5"><span className="material-symbols-outlined" style={{fontSize:'10px'}}>styler</span>{getWorkerName(tl.worker_id)} × {tl.quantity}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery summary */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{t('Delivery & Payment')}</h3>
              <div className="flex gap-6 text-xs">
                {deliveryDate && <div><span className="text-secondary">{t('Delivery')}:</span> <span className="font-medium">{deliveryDate}</span></div>}
                <div><span className="text-secondary">{t('Payment')}:</span> <span className="font-medium capitalize">{paymentMethod}</span></div>
                {orderNotes && <div><span className="text-secondary">{t('Notes')}:</span> <span className="font-medium">{orderNotes}</span></div>}
              </div>
            </div>

            {/* Total & Payment */}
            <div className="bg-primary-fixed/20 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold">{t('Total')}</span>
                <span className="text-xl font-extrabold text-primary">{totalPrice.toFixed(2)} {t('QAR')}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 block">{t('Initial Payment')}</label>
                <input type="number" step="0.01" min={0} max={totalPrice} value={initialPayment}
                  onChange={e => setInitialPayment(Math.max(0, parseFloat(e.target.value) || 0))} className="input-field text-sm" placeholder="0.00" />
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-secondary">{t('Balance')}</span>
                  <span className={`font-bold ${(totalPrice - initialPayment) > 0 ? 'text-error' : 'text-tertiary'}`}>
                    {(totalPrice - initialPayment).toFixed(2)} {t('QAR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </StepCard>
      )}
    </div>
  );
}
