import React, { useEffect, useRef, useState } from 'react';
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

interface PieceType {
  id: number;
  name_en: string;
  name_ar: string;
  category: string;
  base_price: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  custom_wear: 'Custom Wear',
  abaya: 'Abaya',
  uniform: 'Uniforms',
  alteration: 'Alterations',
  special: 'Special Orders',
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NewOrderPage() {
  const navigate = useNavigate();
  const { t, currency } = useTranslation();

  /* Data */
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pieceTypes, setPieceTypes] = useState<PieceType[]>([]);

  /* Form state */
  const [submitting, setSubmitting] = useState(false);
  const [branchId, setBranchId] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('session') || '{}');
      return s.branch_id || 1;
    } catch { return 1; }
  });
  const [formData, setFormData] = useState({
    customerFullName: '',
    customerFirstName: '',
    phoneNumber: '',
    itemType: '',
    quantity: 1,
    measurements: '',
    fabricSource: 'customer' as 'customer' | 'shop',
    fabricDetails: '',
    tailoringPrice: '',
    paidAmount: '',
    paymentMethod: 'cash' as 'cash' | 'card',
    status: 'intake' as string,
    orderDate: formatDate(new Date()),
    deliveryDate: '',
    isAlteration: false,
    alterationPrice: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Overdue warning state */
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueOrders, setOverdueOrders] = useState<any[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  /* Customer lookup state */
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const phoneSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Computed */
  const tailoringPrice = parseFloat(formData.tailoringPrice) || 0;
  const alterationPrice = formData.isAlteration ? (parseFloat(formData.alterationPrice) || 0) : 0;
  const totalPrice = tailoringPrice + alterationPrice;
  const paid = parseFloat(formData.paidAmount) || 0;
  const balance = totalPrice - paid;

  const getBasePrice = (pieceTypeName: string): number => {
    const pt = pieceTypes.find(p => p.name_en === pieceTypeName);
    return pt?.base_price || 0;
  };

  /* Load reference data */
  useEffect(() => {
    async function load() {
      try {
        const [br, pt] = await Promise.all([
          window.electronAPI.branches.getAll(),
          window.electronAPI.pieceTypes.getAll(),
        ]);
        setBranches(br);
        setPieceTypes(pt);
        if (br.length > 0) setBranchId(br[0].id);
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    }
    load();
  }, []);

  /* Phone-based customer lookup */
  const handlePhoneChange = (value: string) => {
    updateField('phoneNumber', value);
    setSelectedCustomerId(null);

    if (phoneSearchTimer.current) clearTimeout(phoneSearchTimer.current);

    if (value.trim().length >= 3) {
      phoneSearchTimer.current = setTimeout(async () => {
        try {
          const results = await window.electronAPI.customers.search(value.trim());
          setCustomerSuggestions(results || []);
          setShowSuggestions((results || []).length > 0);
        } catch (err) {
          console.error('Customer search failed:', err);
          setCustomerSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300);
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const pickExistingCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setFormData(prev => ({
      ...prev,
      customerFullName: customer.name,
      phoneNumber: customer.phone || '',
    }));
    setShowSuggestions(false);
    setCustomerSuggestions([]);
    if (errors.customerFullName) setErrors(prev => { const n = { ...prev }; delete n.customerFullName; return n; });
    if (errors.phoneNumber) setErrors(prev => { const n = { ...prev }; delete n.phoneNumber; return n; });
  };

  /* Validation */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = t('Required');
    if (!formData.itemType) newErrors.itemType = t('Required');
    if (!formData.tailoringPrice || parseFloat(formData.tailoringPrice) <= 0) newErrors.tailoringPrice = t('Required');
    if (!formData.deliveryDate) newErrors.deliveryDate = t('Required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      alert(t('Please fill in all required fields'));
      return;
    }

    setSubmitting(true);
    try {
      // Use existing customer or find/create
      let customerId = selectedCustomerId;
      if (!customerId) {
        const fullName = formData.customerFullName.trim();
        if (fullName) {
          const searchResults = await window.electronAPI.customers.search(fullName);
          const existing = searchResults.find(
            (c: any) => c.phone === formData.phoneNumber.trim()
          );
          if (existing) {
            customerId = existing.id;
          }
        }
        if (!customerId) {
          customerId = await window.electronAPI.customers.create({
            name: fullName || null,
            phone: formData.phoneNumber.trim() || null,
            branch_id: branchId,
          });
        }
      }

      // Check for outstanding balances
      const outstanding = await window.electronAPI.customers.getOutstandingOrders(customerId);
      if (outstanding.length > 0) {
        setOverdueOrders(outstanding);
        setPendingSubmitData({ customerId });
        setShowOverdueModal(true);
        setSubmitting(false);
        return;
      }

      // No outstanding — proceed directly
      await doCreateOrder(customerId);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('Failed to create order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const doCreateOrder = async (customerId: number) => {
    setSubmitting(true);
    try {
      // Build details string
      let details = '';
      if (formData.measurements.trim()) details += formData.measurements.trim();
      if (formData.fabricDetails.trim()) details += (details ? '\n' : '') + formData.fabricDetails.trim();
      if (formData.isAlteration) details += (details ? '\n' : '') + `Alteration: ${formData.alterationPrice}`;

      const orderData = {
        branch_id: branchId,
        customer_id: customerId,
        piece_type: formData.itemType,
        details: details || undefined,
        price: totalPrice,
        paid: paid,
        payment_method: formData.paymentMethod,
        status: formData.status,
        receive_date: formData.orderDate || undefined,
        delivery_date: formData.deliveryDate,
        fabric_source: formData.fabricSource,
      };

      const orderItems = [{
        order_id: 0,
        piece_type: formData.itemType,
        quantity: formData.quantity,
        unit_price: totalPrice,
        total_price: totalPrice,
        fabric_source: formData.fabricSource,
        fabric_price: 0,
        details: details || undefined,
        sort_order: 0,
      }];

      await window.electronAPI.orders.create(orderData, undefined, orderItems);
      navigate('/orders');
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('Failed to create order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedWithOrder = async () => {
    setShowOverdueModal(false);
    if (pendingSubmitData) {
      await doCreateOrder(pendingSubmitData.customerId);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const selectedBranch = branches.find(b => b.id === branchId);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Card */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container-high">
          <h2 className="text-xl font-bold font-headline text-on-surface">
            {t('New Order')} - {t('Branch')} {selectedBranch?.prefix || ''}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Branch Selection ── */}
            {branches.length > 1 && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Workshop Branch')}
                </label>
                <div className="flex gap-2">
                  {branches.map((br) => (
                    <label key={br.id} className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        className="hidden peer"
                        name="branch"
                        checked={branchId === br.id}
                        onChange={() => setBranchId(br.id)}
                      />
                      <div className="py-3 text-center rounded-lg border-2 border-transparent bg-surface-container-low peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-primary transition-all font-bold text-sm">
                        <span className="text-[10px] text-outline block">{br.name_ar}</span>
                        {t('Branch')} {br.prefix}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Customer Info ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Phone Number')} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    autoFocus
                    className={`input-field ${errors.phoneNumber ? '!border-b-error' : ''}`}
                    value={formData.phoneNumber}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onFocus={() => { if (customerSuggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="e.g., 66205455"
                    disabled={submitting}
                  />
                  {selectedCustomerId && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-tertiary text-lg">check_circle</span>
                  )}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-secondary border-b border-outline-variant/20">
                        {t('Existing Customers')}
                      </div>
                      {customerSuggestions.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickExistingCustomer(c)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-primary text-lg">person</span>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{c.name}</p>
                            <p className="text-xs text-secondary">{c.phone || t('No phone')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.phoneNumber && (
                  <p className="text-xs text-error">{errors.phoneNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Customer Full Name')}
                </label>
                <input
                  className={`input-field ${errors.customerFullName ? '!border-b-error' : ''}`}
                  value={formData.customerFullName}
                  onChange={e => updateField('customerFullName', e.target.value)}
                  placeholder={t('Enter full name')}
                  disabled={submitting}
                />
                {errors.customerFullName && (
                  <p className="text-xs text-error">{errors.customerFullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Customer First Name')}
                </label>
                <input
                  className="input-field"
                  value={formData.customerFirstName}
                  onChange={e => updateField('customerFirstName', e.target.value)}
                  placeholder={t('Enter first name only')}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Order Date')}
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.orderDate}
                  onChange={e => updateField('orderDate', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Item Details ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Garment Type')} *
                </label>
                <select
                  className={`input-field ${errors.itemType ? '!border-b-error' : ''}`}
                  value={formData.itemType}
                  onChange={e => {
                    updateField('itemType', e.target.value);
                    const bp = getBasePrice(e.target.value);
                    if (bp > 0) updateField('tailoringPrice', bp.toString());
                  }}
                  disabled={submitting}
                >
                  <option value="">{t('Select garment type...')}</option>
                  {[...new Set(pieceTypes.map(pt => pt.category))].map(cat => (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat] || cat}>
                      {pieceTypes.filter(pt => pt.category === cat).map(pt => (
                        <option key={pt.id} value={pt.name_en}>{pt.name_en} — {pt.name_ar}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.itemType && <p className="text-xs text-error">{errors.itemType}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={formData.quantity}
                  onChange={e => updateField('quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Delivery Date')} *
                </label>
                <input
                  type="date"
                  className={`input-field ${errors.deliveryDate ? '!border-b-error' : ''}`}
                  value={formData.deliveryDate}
                  onChange={e => updateField('deliveryDate', e.target.value)}
                  disabled={submitting}
                />
                {errors.deliveryDate && (
                  <p className="text-xs text-error">{errors.deliveryDate}</p>
                )}
              </div>
            </div>

            {/* ── Measurements ── */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                {t('Measurements')}
              </label>
              <textarea
                className="input-field h-28 pt-4"
                value={formData.measurements}
                onChange={e => updateField('measurements', e.target.value)}
                placeholder={t('Enter measurements details...')}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* ── Fabric ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Fabric Source')}
                </label>
                <select
                  className="input-field"
                  value={formData.fabricSource}
                  onChange={e => updateField('fabricSource', e.target.value)}
                  disabled={submitting}
                >
                  <option value="customer">{t('Customer')}</option>
                  <option value="shop">{t('Shop')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Fabric Details')}
                </label>
                <input
                  className="input-field"
                  value={formData.fabricDetails}
                  onChange={e => updateField('fabricDetails', e.target.value)}
                  placeholder={t('Enter fabric details...')}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Alteration ── */}
            <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
              <input
                type="checkbox"
                id="isAlteration"
                className="w-4 h-4 accent-primary"
                checked={formData.isAlteration}
                onChange={e => updateField('isAlteration', e.target.checked)}
                disabled={submitting}
              />
              <label htmlFor="isAlteration" className="text-sm font-medium cursor-pointer">
                {t('Alteration')}
              </label>

              {formData.isAlteration && (
                <div className="flex-1 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field text-sm"
                    value={formData.alterationPrice}
                    onChange={e => updateField('alterationPrice', e.target.value)}
                    placeholder={t('Alteration Price')}
                    disabled={submitting}
                  />
                </div>
              )}
            </div>

            {/* ── Payment ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Tailoring Price')} ({t(currency)}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`input-field ${errors.tailoringPrice ? '!border-b-error' : ''}`}
                  value={formData.tailoringPrice}
                  onChange={e => updateField('tailoringPrice', e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
                {errors.tailoringPrice && (
                  <p className="text-xs text-error">{errors.tailoringPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Paid Amount')} ({t(currency)})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={formData.paidAmount}
                  onChange={e => updateField('paidAmount', e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Balance')} ({t(currency)})
                </label>
                <div className={`h-14 px-4 rounded-t-lg flex items-center font-semibold text-lg border-b-2 ${
                  balance > 0
                    ? 'bg-surface-container-high border-error text-error'
                    : 'bg-surface-container-high border-tertiary-fixed text-tertiary'
                }`}>
                  {balance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* ── Status & Payment Method ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Payment Method')}
                </label>
                <select
                  className="input-field"
                  value={formData.paymentMethod}
                  onChange={e => updateField('paymentMethod', e.target.value)}
                  disabled={submitting}
                >
                  <option value="cash">{t('Cash')}</option>
                  <option value="card">{t('Card')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-secondary">
                  {t('Order Status')}
                </label>
                <select
                  className="input-field"
                  value={formData.status}
                  onChange={e => updateField('status', e.target.value)}
                  disabled={submitting}
                >
                  <option value="intake">{t('In Progress')}</option>
                  <option value="ready">{t('Ready')}</option>
                  <option value="delivered">{t('Delivered')}</option>
                </select>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="flex-1 py-3 bg-surface-container-high text-secondary rounded-xl font-bold hover:bg-surface-container-highest transition-all"
                disabled={submitting}
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 text-white rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)' }}
                disabled={submitting}
              >
                {submitting ? t('Creating...') : t('Create Order')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Overdue Balance Warning Modal ── */}
      {showOverdueModal && (
        <div className="modal-backdrop" onClick={() => setShowOverdueModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-6 md:px-8 md:py-8">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error">warning</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-headline font-extrabold text-on-surface">
                      {t('Outstanding Balance')}
                    </h2>
                    <p className="text-sm text-secondary mt-1">
                      {t('This customer has unpaid orders. Total outstanding: {total} QAR')
                        .replace('{total}', overdueOrders.reduce((s: number, o: any) => s + (o.balance || 0), 0).toFixed(2))}
                    </p>
                  </div>
                </div>

                {/* Outstanding orders table */}
                <div className="bg-surface-container-low rounded-xl overflow-hidden mb-6 max-h-60 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high">
                      <tr>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary">{t('Order')}</th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary">{t('Item')}</th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary">{t('Status')}</th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary text-right">{t('Balance')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueOrders.map((order: any) => (
                        <tr key={order.id} className="border-t border-outline-variant/20">
                          <td className="px-4 py-2 text-sm font-mono font-bold text-primary">{order.order_number}</td>
                          <td className="px-4 py-2 text-sm text-secondary">{order.piece_type}</td>
                          <td className="px-4 py-2"><span className="chip chip-progress">{order.status}</span></td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-error">
                            {Number(order.balance).toFixed(2)} {t(currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOverdueModal(false)}
                    className="flex-1 py-3 bg-surface-container-high text-secondary rounded-xl font-bold hover:bg-surface-container-highest transition-all"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleProceedWithOrder}
                    className="flex-1 py-3 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)' }}
                  >
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {t('Proceed Anyway')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
