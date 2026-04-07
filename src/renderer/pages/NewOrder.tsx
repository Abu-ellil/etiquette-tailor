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
  fabric_price: number;
  details: string;
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
    fabric_price: 0,
    details: '',
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

  /* Computed */
  const totalPrice = items.reduce((sum, item) => {
    const fabricCost = item.fabric_source === 'shop' ? item.fabric_price * item.quantity : 0;
    return sum + item.unit_price * item.quantity + fabricCost;
  }, 0);
  const balance = totalPrice - paid;

  const getBasePrice = (pieceTypeName: string): number => {
    const pt = pieceTypes.find(p => p.name_en === pieceTypeName);
    return pt?.base_price || 0;
  };

  /* Load reference data */
  useEffect(() => {
    async function load() {
      try {
        const [br, pt, cust] = await Promise.all([
          window.electronAPI.branches.getAll(),
          window.electronAPI.pieceTypes.getAll(),
          window.electronAPI.customers.getAll(),
        ]);
        setBranches(br);
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

  /* Auto-fill unit price from base_price when piece type changes */
  const handlePieceTypeChange = (idx: number, pieceTypeName: string) => {
    const bp = getBasePrice(pieceTypeName);
    updateItem(idx, { piece_type: pieceTypeName, unit_price: bp });
  };

  /* Submit */
  const onSubmit = async () => {
    if (!customerId) { alert(t('Please select a customer.')); return; }
    if (!deliveryDate) { alert(t('Please set a delivery date.')); return; }
    if (items.length === 0 || items.every(i => !i.piece_type)) {
      alert(t('Please add at least one item.')); return;
    }
    for (const item of items) {
      if (!item.piece_type) { alert(t('Please select a piece type for all items.')); return; }
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

      const orderItems = items.map((item, idx) => ({
        order_id: 0,
        piece_type: item.piece_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        fabric_source: item.fabric_source,
        fabric_price: item.fabric_source === 'shop' ? item.fabric_price : 0,
        details: item.details || undefined,
        sort_order: idx,
      }));

      await window.electronAPI.orders.create(orderData, undefined, orderItems);
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
                    <div className={`grid grid-cols-1 gap-3 ${item.fabric_source === 'shop' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                      {/* Piece type */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">
                          {t('Garment Type')}
                        </label>
                        <select
                          className="input-field text-sm"
                          value={item.piece_type}
                          onChange={e => handlePieceTypeChange(idx, e.target.value)}
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

                      {/* Fabric price - only when fabric from shop */}
                      {item.fabric_source === 'shop' && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-secondary">{t('Fabric Price')} ({t(currency)})</label>
                          <input type="number" step="0.01" min={0} className="input-field text-sm" value={item.fabric_price}
                            onChange={e => updateItem(idx, { fabric_price: Number(e.target.value) })} />
                        </div>
                      )}
                    </div>

                    {/* Line total */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">
                        {t('Line Total')}: <strong className="text-on-surface">{((item.unit_price * item.quantity) + (item.fabric_source === 'shop' ? item.fabric_price * item.quantity : 0)).toFixed(2)} {t(currency)}</strong>
                      </span>
                      {basePrice > 0 && (
                        <span className="text-xs text-outline">
                          {t('Base Price')}: {basePrice} {t(currency)}
                        </span>
                      )}
                    </div>
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
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">{t('Quick Note')}</p>
            <p className="font-bold text-on-surface">{t('Balance Auto-Calculated')}</p>
            <p className="text-sm text-outline">{t('Price − Paid = Balance')}</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary">
            <p className="text-xs uppercase tracking-widest text-secondary mb-1">{t('Total Items')}</p>
            <p className="font-bold text-on-surface">{items.length} {t('item(s)')}</p>
            <p className="text-sm text-outline">{totalPrice.toFixed(2)} {t(currency)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
