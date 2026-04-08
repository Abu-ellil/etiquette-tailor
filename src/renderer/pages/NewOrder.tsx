import React, { useEffect, useState } from 'react';
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

  /* Validation */
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerFullName.trim()) newErrors.customerFullName = t('Required');
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
      // Find or create customer
      let customerId = 0;
      const searchResults = await window.electronAPI.customers.search(formData.customerFullName.trim());
      const existing = searchResults.find(
        (c: any) => c.phone === formData.phoneNumber.trim()
      );
      if (existing) {
        customerId = existing.id;
      } else {
        customerId = await window.electronAPI.customers.create({
          name: formData.customerFullName.trim(),
          phone: formData.phoneNumber.trim() || null,
          branch_id: branchId,
        });
      }

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
        quantity: 1,
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
                  {t('Customer Full Name')} *
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
                  {t('Phone Number')} *
                </label>
                <input
                  type="tel"
                  className={`input-field ${errors.phoneNumber ? '!border-b-error' : ''}`}
                  value={formData.phoneNumber}
                  onChange={e => updateField('phoneNumber', e.target.value)}
                  placeholder="e.g., 66205455"
                  disabled={submitting}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-error">{errors.phoneNumber}</p>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}
