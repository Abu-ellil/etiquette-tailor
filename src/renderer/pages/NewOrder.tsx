import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  prefix: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Worker {
  id: number;
  name: string;
  worker_type?: string | null;
  branch_id: number;
}

interface PieceType {
  id: number;
  name_en: string;
  name_ar: string;
  category: string;
  base_price: number;
}

interface ItemForm {
  key: string;
  piece_type: string;
  quantity: number;
  unit_price: number;
  fabric_source: 'customer' | 'shop';
  details: string;
  cutter_id: number | null;
  tailor_assignments: { worker_id: number; quantity: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  custom_wear: 'Custom Wear',
  abaya: 'Abaya',
  uniform: 'Uniforms',
  alteration: 'Alterations',
  special: 'Special Orders',
};

let itemKeyCounter = 0;
function newItemKey() { return `item-${++itemKeyCounter}`; }

function createEmptyItem(): ItemForm {
  return {
    key: newItemKey(),
    piece_type: '',
    quantity: 1,
    unit_price: 0,
    fabric_source: 'customer',
    details: '',
    cutter_id: null,
    tailor_assignments: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NewOrderPage() {
  const navigate = useNavigate();
  const { t, currency } = useTranslation();

  /* Data */
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [pieceTypes, setPieceTypes] = useState<PieceType[]>([]);

  /* Form state */
  const [submitting, setSubmitting] = useState(false);
  const [branchId, setBranchId] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [customerId, setCustomerId] = useState(0);
  const [paid, setPaid] = useState(0);
  const [receiveDate, setReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [items, setItems] = useState<ItemForm[]>([createEmptyItem()]);

  /* Customer search */
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  /* Worker rates cache: key = `${workerId}-${pieceType}` */
  const [workerRateCache, setWorkerRateCache] = useState<Record<string, { wage_type: string; rate: number }>>({});

  /* Computed */
  const totalPrice = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const balance = totalPrice - paid;

  const getBasePrice = (pieceTypeName: string): number => {
    const pt = pieceTypes.find(p => p.name_en === pieceTypeName);
    return pt?.base_price || 0;
  };

  const getWorkerRate = (workerId: number, pieceType: string): { wage_type: string; rate: number } | null => {
    return workerRateCache[`${workerId}-${pieceType}`] || null;
  };

  const calcWage = (basePrice: number, wageType: string, rate: number, qty: number): number => {
    if (wageType === 'percentage') return basePrice * (rate / 100) * qty;
    return rate * qty;
  };

  /* Load reference data */
  useEffect(() => {
    async function load() {
      try {
        const [br, wr, pt, cust] = await Promise.all([
          window.electronAPI.branches.getAll(),
          window.electronAPI.workers.getAll(),
          window.electronAPI.pieceTypes.getAll(),
          window.electronAPI.customers.getAll(),
        ]);
        setBranches(br);
        setWorkers(wr);
        setPieceTypes(pt);
        setCustomers(cust);
        if (br.length > 0) setBranchId(br[0].id);
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    }
    load();
  }, []);

  /* Customer search */
  const searchCust = useCallback(async (q: string) => {
    if (!q.trim()) {
      const all = await window.electronAPI.customers.getAll();
      setCustomers(all);
      return;
    }
    try {
      setCustomers(await window.electronAPI.customers.search(q));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCust(customerSearch), 250);
    return () => clearTimeout(t);
  }, [customerSearch, searchCust]);

  /* Load worker rates when items change */
  useEffect(() => {
    async function loadRates() {
      const newEntries: Record<string, { wage_type: string; rate: number }> = {};
      for (const item of items) {
        if (!item.piece_type) continue;
        // Load cutter rate
        if (item.cutter_id) {
          const key = `${item.cutter_id}-${item.piece_type}`;
          if (!workerRateCache[key]) {
            try {
              const rate = await window.electronAPI.workers.getActiveRate(item.cutter_id, item.piece_type);
              if (rate) newEntries[key] = { wage_type: rate.wage_type, rate: rate.rate };
            } catch { /* ignore */ }
          }
        }
        // Load tailor rates
        for (const ta of item.tailor_assignments) {
          const key = `${ta.worker_id}-${item.piece_type}`;
          if (!workerRateCache[key] && !newEntries[key]) {
            try {
              const rate = await window.electronAPI.workers.getActiveRate(ta.worker_id, item.piece_type);
              if (rate) newEntries[key] = { wage_type: rate.wage_type, rate: rate.rate };
            } catch { /* ignore */ }
          }
        }
      }
      if (Object.keys(newEntries).length > 0) {
        setWorkerRateCache(prev => ({ ...prev, ...newEntries }));
      }
    }
    loadRates();
  }, [items]);

  /* Create new customer */
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const id = await window.electronAPI.customers.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        branch_id: branchId,
      });
      setCustomerId(id);
      setShowNewCustomer(false);
      setShowCustomerDropdown(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setCustomerSearch(newCustomerName.trim());
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  /* Item management */
  const updateItem = (idx: number, updates: Partial<ItemForm>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const addItem = () => setItems(prev => [...prev, createEmptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addTailorToItem = (idx: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, tailor_assignments: [...item.tailor_assignments, { worker_id: 0, quantity: 0 }] } : item
    ));
  };

  const updateTailorAssignment = (itemIdx: number, taIdx: number, updates: Partial<{ worker_id: number; quantity: number }>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const newAssignments = item.tailor_assignments.map((ta, j) =>
        j === taIdx ? { ...ta, ...updates } : ta
      );
      return { ...item, tailor_assignments: newAssignments };
    }));
  };

  const removeTailorAssignment = (itemIdx: number, taIdx: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, tailor_assignments: item.tailor_assignments.filter((_, j) => j !== taIdx) };
    }));
  };

  const getTailors = () => workers.filter(w => w.worker_type === 'tailor' || !w.worker_type);
  const getCutters = () => workers.filter(w => w.worker_type === 'master_cutter');

  /* Submit */
  const onSubmit = async () => {
    if (!customerId) { alert(t('Please select a customer.')); return; }
    if (!deliveryDate) { alert(t('Please set a delivery date.')); return; }
    if (items.length === 0 || items.every(i => !i.piece_type)) {
      alert(t('Please add at least one item.')); return;
    }
    // Validate tailor assignments
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.piece_type) { alert(t('Please select a piece type for all items.')); return; }
      if (item.tailor_assignments.length > 0) {
        const totalAssigned = item.tailor_assignments.reduce((s, ta) => s + ta.quantity, 0);
        if (totalAssigned !== item.quantity) {
          alert(t('Tailor assignments must equal item quantity for') + ' ' + item.piece_type);
          return;
        }
        for (const ta of item.tailor_assignments) {
          if (!ta.worker_id) { alert(t('Please select a worker for all assignments.')); return; }
        }
      }
    }

    setSubmitting(true);
    try {
      const orderData = {
        branch_id: branchId,
        customer_id: customerId,
        piece_type: items[0]?.piece_type || '',
        details: orderDetails || undefined,
        price: totalPrice,
        paid: paid,
        payment_method: paymentMethod,
        status: 'intake' as const,
        receive_date: receiveDate || undefined,
        delivery_date: deliveryDate,
        fabric_source: items[0]?.fabric_source || 'customer',
      };

      // Prepare items array for createOrder
      const orderItems = items.map((item, idx) => ({
        order_id: 0, // will be set by createOrder
        piece_type: item.piece_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        fabric_source: item.fabric_source,
        details: item.details || undefined,
        sort_order: idx,
      }));

      const orderId = await window.electronAPI.orders.create(orderData, undefined, orderItems);

      // Create tasks for each item
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        // Get the order_item_id (items were created in order)
        const orderItemId = await window.electronAPI.orders.getItems(orderId).then(
          (items: any[]) => items[idx]?.id
        );

        // Create cutting task
        if (item.cutter_id) {
          const rate = getWorkerRate(item.cutter_id, item.piece_type);
          if (rate) {
            const bp = getBasePrice(item.piece_type);
            const wageAmount = calcWage(bp, rate.wage_type, rate.rate, item.quantity);
            await window.electronAPI.orders.createTask({
              order_id: orderId,
              order_item_id: orderItemId,
              task_type: 'cutting',
              assigned_to: item.cutter_id,
              wage_type: rate.wage_type,
              wage_rate: rate.rate,
              wage_amount: wageAmount,
              task_quantity: item.quantity,
              status: 'pending',
            });
          }
        }

        // Create sewing tasks
        for (const ta of item.tailor_assignments) {
          if (!ta.worker_id || ta.quantity <= 0) continue;
          const rate = getWorkerRate(ta.worker_id, item.piece_type);
          const bp = getBasePrice(item.piece_type);
          const wageType = rate?.wage_type || 'percentage';
          const wageRate = rate?.rate || 0;
          const wageAmount = calcWage(bp, wageType, wageRate, ta.quantity);
          await window.electronAPI.orders.createTask({
            order_id: orderId,
            order_item_id: orderItemId,
            task_type: 'sewing',
            assigned_to: ta.worker_id,
            wage_type: wageType,
            wage_rate: wageRate,
            wage_amount: wageAmount,
            task_quantity: ta.quantity,
            status: 'pending',
          });
        }
      }

      navigate('/orders');
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('Failed to create order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const today = format(new Date(), 'MMMM dd, yyyy');

  return (
    <div>
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 md:mb-12 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-secondary text-sm uppercase tracking-[0.2em] font-semibold mb-2">
            {t('Order Management')}
          </h2>
          <h1 className="text-5xl font-extrabold tracking-tight text-on-background font-headline">
            {t('New Order')}
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-widest text-outline">{t('TODAY')}</span>
          <span className="text-lg text-secondary font-medium">{today}</span>
        </div>
      </header>

      {/* Form */}
      <section className="max-w-5xl mx-auto">
        <div className="bg-surface-container-lowest p-4 md:p-8 lg:p-12 rounded-2xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)]">
          <div className="space-y-10">
            {/* Branch & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 lg:gap-12">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  {t('Workshop Branch')}
                </label>
                <div className="flex gap-2">
                  {branches.map((br) => (
                    <label key={br.id} className="flex-1 cursor-pointer group">
                      <input
                        type="radio"
                        className="hidden peer"
                        name="branch"
                        checked={branchId === br.id}
                        onChange={() => setBranchId(br.id)}
                      />
                      <div className="py-4 text-center rounded-lg border-2 border-transparent bg-surface-container-low peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-primary transition-all font-bold">
                        <span className="text-[11px] text-outline block">{br.name_ar}</span>
                        {t('Branch')} {br.prefix}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  {t('Payment Method')}
                </label>
                <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl">
                  {(['cash', 'card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all capitalize ${
                        paymentMethod === method
                          ? 'bg-surface-container-lowest shadow-sm text-primary'
                          : 'text-secondary font-semibold hover:bg-surface-container-high'
                      }`}
                    >
                      {t(method)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer Search */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                {t('Customer Search & Selection')}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  className="input-field pl-12"
                  placeholder={t('Type to search or click to see all customers...')}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (!customerId) setShowCustomerDropdown(true);
                  }}
                  onFocus={() => { if (!customerId) setShowCustomerDropdown(true); }}
                />
              </div>
              {showCustomerDropdown && !customerId && (
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-secondary text-center">
                      {t('No customers found. Create a new one below.')}
                    </div>
                  ) : (
                    customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerSearch(`${c.name}${c.phone ? ` (${c.phone})` : ''}`);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-container-high transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">
                          {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{c.name}</p>
                          {c.phone && <p className="text-xs text-outline">{c.phone}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {customerId > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="chip chip-progress">{t('Customer selected')}</span>
                  <button
                    type="button"
                    onClick={() => { setCustomerId(0); setCustomerSearch(''); setShowCustomerDropdown(false); searchCust(''); }}
                    className="text-xs text-error hover:underline"
                  >
                    {t('Clear')}
                  </button>
                </div>
              )}
              {!showNewCustomer && (
                <button type="button" onClick={() => setShowNewCustomer(true)} className="text-xs text-primary font-semibold hover:underline mt-1 ml-1">
                  {t('+ Create new customer')}
                </button>
              )}
              {showNewCustomer && (
                <div className="mt-3 p-4 bg-surface-container-high rounded-xl space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t('New Customer')}</p>
                  <input type="text" className="input-field" placeholder={t('Customer name')} value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                  <input type="text" className="input-field" placeholder={t('Phone number (optional)')} value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCreateCustomer} className="btn-primary px-4 py-2 text-sm rounded-lg">{t('Save Customer')}</button>
                    <button type="button" onClick={() => setShowNewCustomer(false)} className="px-4 py-2 text-sm text-secondary hover:bg-surface-container-high rounded-lg transition-colors">{t('Cancel')}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-4 pt-6 border-t border-surface-container-high">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight font-headline">
                  {t('Order Items')}
                </h3>
                <button type="button" onClick={addItem} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">add</span>
                  {t('Add Item')}
                </button>
              </div>

              {items.map((item, idx) => {
                const basePrice = getBasePrice(item.piece_type);
                const cutters = getCutters();
                const tailors = getTailors();
                const totalAssigned = item.tailor_assignments.reduce((s, ta) => s + ta.quantity, 0);
                const assignmentComplete = totalAssigned === item.quantity && item.tailor_assignments.length > 0;

                return (
                  <div key={item.key} className="bg-surface-container-low p-4 md:p-6 rounded-xl space-y-4">
                    {/* Item header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-error hover:bg-error/10 p-1 rounded-full">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Item details grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Piece type */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">
                          {t('Garment Type')}
                        </label>
                        <select
                          className="input-field text-sm"
                          value={item.piece_type}
                          onChange={e => updateItem(idx, { piece_type: e.target.value })}
                        >
                          <option value="">{t('Select...')}</option>
                          {[...new Set(pieceTypes.map(pt => pt.category))].map(cat => (
                            <optgroup key={cat} label={CATEGORY_LABELS[cat] || cat}>
                              {pieceTypes.filter(pt => pt.category === cat).map(pt => (
                                <option key={pt.id} value={pt.name_en}>{pt.name_en} — {pt.name_ar}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">{t('Quantity')}</label>
                        <input type="number" min={1} className="input-field text-sm" value={item.quantity}
                          onChange={e => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })} />
                      </div>

                      {/* Unit price */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">{t('Unit Price')} ({t(currency)})</label>
                        <input type="number" step="0.01" min={0} className="input-field text-sm" value={item.unit_price}
                          onChange={e => updateItem(idx, { unit_price: Number(e.target.value) })} />
                      </div>

                      {/* Fabric source */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">{t('Fabric Source')}</label>
                        <div className="flex gap-1 p-1 bg-surface-container-lowest rounded-lg">
                          {(['customer', 'shop'] as const).map(fs => (
                            <button key={fs} type="button"
                              onClick={() => updateItem(idx, { fabric_source: fs })}
                              className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                                item.fabric_source === fs ? 'bg-primary-fixed text-on-primary-fixed' : 'text-secondary'
                              }`}
                            >
                              {fs === 'customer' ? t('Customer') : t('Shop')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Line total + base price info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">
                        {t('Line Total')}: <strong className="text-on-surface">{(item.unit_price * item.quantity).toFixed(2)} {t(currency)}</strong>
                      </span>
                      {basePrice > 0 && (
                        <span className="text-xs text-outline">
                          {t('Base Price')}: {basePrice} {t(currency)} × {item.quantity} = {(basePrice * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Worker Assignment */}
                    {item.piece_type && (
                      <div className="space-y-3 pt-3 border-t border-outline-variant/20">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">{t('Worker Assignment')}</h4>

                        {/* Cutter */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">{t('Cutter')}</label>
                            <select className="input-field text-sm"
                              value={item.cutter_id || 0}
                              onChange={e => updateItem(idx, { cutter_id: Number(e.target.value) || null })}
                            >
                              <option value={0}>{t('Select Cutter...')}</option>
                              {cutters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                          {item.cutter_id && basePrice > 0 && (() => {
                            const rate = getWorkerRate(item.cutter_id, item.piece_type);
                            if (!rate) return <div className="text-xs text-error">{t('No rate configured')}</div>;
                            const wage = calcWage(basePrice, rate.wage_type, rate.rate, item.quantity);
                            return (
                              <div className="bg-primary-container/10 border border-primary-container/30 rounded-lg p-2 text-xs">
                                {t('Cutter Wage')}: {basePrice} × {rate.rate}% × {item.quantity} = <strong className="text-primary">{wage.toFixed(2)} {t(currency)}</strong>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Tailors */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-secondary">
                              {t('Tailors')} ({totalAssigned}/{item.quantity})
                            </label>
                            <button type="button" onClick={() => addTailorToItem(idx)} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-sm">add</span>{t('Add Tailor')}
                            </button>
                          </div>

                          {!assignmentComplete && item.tailor_assignments.length > 0 && totalAssigned !== item.quantity && (
                            <div className="text-xs text-error">{t('Assigned quantity must equal item quantity')}: {totalAssigned}/{item.quantity}</div>
                          )}

                          {item.tailor_assignments.map((ta, taIdx) => {
                            const rate = ta.worker_id ? getWorkerRate(ta.worker_id, item.piece_type) : null;
                            const wage = rate && basePrice > 0 ? calcWage(basePrice, rate.wage_type, rate.rate, ta.quantity) : 0;
                            return (
                              <div key={taIdx} className="grid grid-cols-[1fr_80px_auto_auto] gap-2 items-center bg-surface-container-lowest p-2 rounded-lg">
                                <select className="input-field text-sm" value={ta.worker_id}
                                  onChange={e => updateTailorAssignment(idx, taIdx, { worker_id: Number(e.target.value) })}
                                >
                                  <option value={0}>{t('Select Tailor...')}</option>
                                  {tailors.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <input type="number" min={1} max={item.quantity} className="input-field text-sm text-center"
                                  value={ta.quantity || ''} placeholder={t('Qty')}
                                  onChange={e => updateTailorAssignment(idx, taIdx, { quantity: Math.max(0, Number(e.target.value)) })}
                                />
                                <span className="text-xs text-on-surface min-w-[80px] text-right">
                                  {wage > 0 ? `${wage.toFixed(2)} ${t(currency)}` : '—'}
                                </span>
                                <button type="button" onClick={() => removeTailorAssignment(idx, taIdx)} className="text-error hover:bg-error/10 p-1 rounded-full">
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                {t('Detailed Description & Special Instructions')}
              </label>
              <textarea className="input-field h-28 pt-4" placeholder={t('Enter fabric details, embroidery patterns, sizing notes...')}
                value={orderDetails} onChange={e => setOrderDetails(e.target.value)} />
            </div>

            {/* Financials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-surface-container-low rounded-2xl">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {`${t('Total Price')} (${t(currency)})`}
                </label>
                <div className="w-full h-14 bg-surface-container-lowest border-b-2 border-outline-variant font-bold text-xl text-on-surface px-4 rounded-t-lg flex items-center">
                  {totalPrice.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {`${t('Paid')} (${t(currency)})`}
                </label>
                <input type="number" step="0.01"
                  className="w-full h-14 bg-surface-container-lowest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 font-bold text-xl text-on-surface px-4 rounded-t-lg outline-none"
                  value={paid} onChange={e => setPaid(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {`${t('Balance Due')} (${t(currency)})`}
                </label>
                <div className={`w-full h-14 bg-surface-container-high border-b-2 font-bold text-xl px-4 rounded-t-lg flex items-center ${
                  balance > 0 ? 'border-error text-error' : 'border-tertiary-fixed text-tertiary'
                }`}>
                  {balance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 lg:gap-12">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  {t('Received Date')}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">calendar_today</span>
                  <input type="date" className="input-field pr-12" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary ml-1">
                  {t('Estimated Delivery Date')}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">event_upcoming</span>
                  <input type="date" className="input-field pr-12 border-b-primary" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-8 flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="flex-1 h-20 text-white rounded-xl font-headline font-extrabold text-xl shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)' }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                {submitting ? t('Creating...') : t('Create Order')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="px-12 h-20 bg-surface-container-high text-secondary rounded-xl font-headline font-bold hover:bg-surface-container-highest transition-all"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>

        {/* Context Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-tertiary-container">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">{t('Branches')}</p>
            <p className="font-bold text-on-surface">{branches.length} {t('Active')}</p>
            <p className="text-sm text-outline">{branches.map(b => `${t('Branch')} ${b.prefix}`).join(' & ')}</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-primary">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">{t('Workers')}</p>
            <p className="font-bold text-on-surface">{workers.length} {t('Available')}</p>
            <p className="text-sm text-outline">
              {workers.slice(0, 3).map(w => w.name).join(', ')}
              {workers.length > 3 ? ` +${workers.length - 3} ${t('more')}` : ''}
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">{t('Quick Note')}</p>
            <p className="font-bold text-on-surface">{t('Balance Auto-Calculated')}</p>
            <p className="text-sm text-outline">{t('Wage = Base Price × Rate × Qty')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
