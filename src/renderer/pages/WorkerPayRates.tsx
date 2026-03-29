import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Worker {
  id: number;
  name: string;
  worker_type?: string | null;
  base_salary: number;
}

interface WorkerRate {
  id?: number;
  user_id: number;
  piece_type: string;
  wage_type: 'percentage' | 'fixed';
  rate: number;
  season_start?: string;
  season_end?: string;
}

interface RateRowValues {
  rate: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PIECE_TYPES = [
  { key: 'جلابية', label: 'Jalabiya', description: 'Traditional Evening Wear', icon: 'styler', color: 'bg-primary-fixed' },
  { key: 'عباية', label: 'Abaya', description: 'Classic Modern Cut', icon: 'checkroom', color: 'bg-secondary-container' },
  { key: 'فستان', label: 'Dress', description: 'Formal & Casual', icon: 'apparel', color: 'bg-tertiary-fixed' },
  { key: 'تعديل', label: 'Alteration', description: 'Repair & Adjustment', icon: 'content_cut', color: 'bg-surface-container-high' },
  { key: 'other', label: 'Other', description: 'Miscellaneous Pieces', icon: 'layers', color: 'bg-primary-fixed-dim' },
];

const ICON_TEXT_COLORS: Record<string, string> = {
  'bg-primary-fixed': 'text-on-primary-fixed',
  'bg-secondary-container': 'text-on-secondary-container',
  'bg-tertiary-fixed': 'text-on-tertiary-fixed',
  'bg-surface-container-high': 'text-on-surface-variant',
  'bg-primary-fixed-dim': 'text-primary',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WorkerPayRatesPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [rates, setRates] = useState<Record<string, WorkerRate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculatorPrice, setCalculatorPrice] = useState(50);
  const [dirty, setDirty] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  /* ---- Load workers ---- */

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.workers.getAll();
      setWorkers(data || []);
      if (data && data.length > 0 && !selectedWorkerId) {
        setSelectedWorkerId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkerId]);

  useEffect(() => {
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Load rates when worker changes ---- */

  useEffect(() => {
    if (!selectedWorkerId) return;

    const loadRates = async () => {
      try {
        const data: WorkerRate[] = await window.electronAPI.workers.getRates(selectedWorkerId);
        const rateMap: Record<string, WorkerRate> = {};
        for (const r of data || []) {
          rateMap[r.piece_type] = r;
        }
        setRates(rateMap);
        setDirty(false);
      } catch (err) {
        console.error('Failed to load rates:', err);
        setRates({});
      }
    };

    loadRates();
  }, [selectedWorkerId]);

  /* ---- Derived stats ---- */

  const configuredCount = Object.keys(rates).filter((k) => rates[k].rate > 0).length;
  const ratesArray = PIECE_TYPES.map((pt) => rates[pt.key]).filter(Boolean);
  const avgRate =
    ratesArray.length > 0
      ? ratesArray.reduce((sum, r) => sum + r.rate, 0) / ratesArray.length
      : 0;
  const avgPercentage =
    ratesArray.filter((r) => r.wage_type === 'percentage').length > 0
      ? ratesArray
          .filter((r) => r.wage_type === 'percentage')
          .reduce((s, r) => s + r.rate, 0) /
        ratesArray.filter((r) => r.wage_type === 'percentage').length
      : 0;

  /* ---- Toggle wage type ---- */

  const toggleWageType = (pieceType: string) => {
    setRates((prev) => {
      const existing = prev[pieceType] || {
        user_id: selectedWorkerId!,
        piece_type: pieceType,
        wage_type: 'percentage' as const,
        rate: 0,
      };
      const newType = existing.wage_type === 'percentage' ? 'fixed' : 'percentage';
      return {
        ...prev,
        [pieceType]: { ...existing, wage_type: newType as 'percentage' | 'fixed' },
      };
    });
    setDirty(true);
  };

  /* ---- Update rate value ---- */

  const updateRate = (pieceType: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setRates((prev) => {
      const existing = prev[pieceType] || {
        user_id: selectedWorkerId!,
        piece_type: pieceType,
        wage_type: 'percentage' as const,
        rate: 0,
      };
      return {
        ...prev,
        [pieceType]: { ...existing, rate: numVal },
      };
    });
    setDirty(true);
  };

  /* ---- Save all rates ---- */

  const handleSave = async () => {
    if (!selectedWorkerId) return;
    try {
      setSaving(true);
      for (const pt of PIECE_TYPES) {
        const rate = rates[pt.key];
        if (rate && rate.rate > 0) {
          await window.electronAPI.workers.setRate({
            user_id: selectedWorkerId,
            piece_type: pt.key,
            wage_type: rate.wage_type,
            rate: rate.rate,
          });
        }
      }
      setDirty(false);
    } catch (err) {
      console.error('Failed to save rates:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Discard changes ---- */

  const handleDiscard = async () => {
    if (!selectedWorkerId) return;
    try {
      const data: WorkerRate[] = await window.electronAPI.workers.getRates(selectedWorkerId);
      const rateMap: Record<string, WorkerRate> = {};
      for (const r of data || []) {
        rateMap[r.piece_type] = r;
      }
      setRates(rateMap);
      setDirty(false);
    } catch (err) {
      console.error('Failed to reload rates:', err);
    }
  };

  /* ---- Calculator ---- */

  const getCalculatorResult = () => {
    // Use first percentage rate found for the calculator, or default 18%
    const firstPctRate = ratesArray.find((r) => r.wage_type === 'percentage');
    const pct = firstPctRate?.rate || 18;
    const commission = calculatorPrice * (pct / 100);
    const net = calculatorPrice - commission;
    return { commission, net, pct };
  };

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading workers...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ---- Header ---- */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[3.5rem] font-headline font-extrabold leading-none text-on-surface tracking-tight mb-2">
            Worker Rates
          </h1>
          <p className="text-secondary text-lg">
            Define commission structures and seasonal profit distributions.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDiscard}
            disabled={!dirty}
            className="px-6 py-3 bg-surface-container text-secondary font-semibold rounded-md border border-outline-variant/15 hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-primary px-11 py-3 text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Rates'}
          </button>
        </div>
      </div>

      {/* ---- Worker Selector ---- */}
      <div className="relative inline-block">
        <label className="text-xs font-bold tracking-widest uppercase text-secondary mb-2 block">
          Select Worker
        </label>
        <div className="relative">
          <select
            value={selectedWorkerId || ''}
            onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
            className="input-field pr-10 min-w-[280px] appearance-none cursor-pointer"
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* ---- Bento Grid ---- */}
      <div className="grid grid-cols-12 gap-8">
        {/* ---- Left: Rate Cards (col-span-8) ---- */}
        <section className="col-span-8 space-y-8">
          {/* Percentage per Item Type */}
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-headline font-bold">Percentage per Item Type</h3>
              <span className="material-symbols-outlined text-secondary opacity-50">info</span>
            </div>

            <div className="space-y-1">
              {/* Table Headers */}
              <div className="grid grid-cols-12 px-6 py-3">
                <div className="col-span-4 text-[10px] font-bold tracking-[0.05em] uppercase text-secondary">
                  Item Category
                </div>
                <div className="col-span-3 text-[10px] font-bold tracking-[0.05em] uppercase text-secondary">
                  Rate Type
                </div>
                <div className="col-span-3 text-[10px] font-bold tracking-[0.05em] uppercase text-secondary text-right">
                  Standard Rate
                </div>
                <div className="col-span-2 text-[10px] font-bold tracking-[0.05em] uppercase text-secondary text-right">
                  Wage Preview
                </div>
              </div>

              {/* Rate Rows */}
              {PIECE_TYPES.map((pt, idx) => {
                const rate = rates[pt.key] || {
                  user_id: selectedWorkerId!,
                  piece_type: pt.key,
                  wage_type: 'percentage' as const,
                  rate: 0,
                };
                const iconTextColor = ICON_TEXT_COLORS[pt.color] || 'text-on-surface';
                const rowBg = idx % 2 === 0 ? 'bg-surface' : 'bg-surface-container-low';
                const wagePreview =
                  rate.wage_type === 'percentage'
                    ? `${((calculatorPrice * rate.rate) / 100).toFixed(2)} QAR`
                    : `${rate.rate.toFixed(2)} QAR`;

                return (
                  <div
                    key={pt.key}
                    className={`grid grid-cols-12 items-center px-6 py-5 ${rowBg} rounded-lg mb-2`}
                  >
                    {/* Item Category */}
                    <div className="col-span-4 flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded ${pt.color} flex items-center justify-center`}
                      >
                        <span className={`material-symbols-outlined text-xl ${iconTextColor}`}>
                          {pt.icon}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{pt.label}</p>
                        <p className="text-xs text-secondary">{pt.description}</p>
                      </div>
                    </div>

                    {/* Rate Type Toggle */}
                    <div className="col-span-3">
                      <button
                        onClick={() => toggleWageType(pt.key)}
                        className="flex items-center gap-2 group"
                      >
                        <span
                          className={`material-symbols-outlined text-2xl transition-colors ${
                            rate.wage_type === 'percentage'
                              ? 'text-primary'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {rate.wage_type === 'percentage' ? 'toggle_on' : 'toggle_off'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          {rate.wage_type === 'percentage' ? 'Percent' : 'Fixed'}
                        </span>
                      </button>
                    </div>

                    {/* Rate Input */}
                    <div className="col-span-3 flex justify-end">
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step={rate.wage_type === 'percentage' ? '0.5' : '0.01'}
                          value={rate.rate || ''}
                          onChange={(e) => updateRate(pt.key, e.target.value)}
                          className="bg-surface-container-high w-full h-12 pl-4 pr-8 text-right font-bold text-on-surface rounded-t-sm border-none border-b-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-3.5 text-secondary font-medium">
                          {rate.wage_type === 'percentage' ? '%' : 'QAR'}
                        </span>
                      </div>
                    </div>

                    {/* Wage Preview */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-bold text-primary">
                        {rate.rate > 0 ? wagePreview : '--'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seasonal Override Info Card */}
          <div className="bg-primary-container/10 rounded-xl p-8 border border-primary-container/20">
            <div className="flex items-start justify-between">
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">event_repeat</span>
                </div>
                <div>
                  <h3 className="text-xl font-headline font-bold text-on-surface mb-1">
                    Seasonal Override
                  </h3>
                  <p className="text-on-surface-variant max-w-lg">
                    Increase rates automatically during peak holidays (Eid, Ramadan) to incentivize
                    production speed.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div className="bg-white/50 p-5 rounded-lg border border-primary-container/10">
                <p className="text-[10px] font-bold tracking-widest uppercase text-secondary mb-3">
                  Configured Rates
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-headline font-bold text-primary">
                    {configuredCount}
                  </span>
                  <span className="text-xs text-secondary mb-1.5">
                    of {PIECE_TYPES.length} types
                  </span>
                </div>
              </div>
              <div className="bg-white/50 p-5 rounded-lg border border-primary-container/10">
                <p className="text-[10px] font-bold tracking-widest uppercase text-secondary mb-3">
                  Average Rate
                </p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calculate</span>
                  <span className="text-sm font-semibold text-on-surface">
                    {avgRate.toFixed(1)}
                    {ratesArray.some((r) => r.wage_type === 'percentage') ? '%' : ' avg'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Right: Sidebar Widgets (col-span-4) ---- */}
        <section className="col-span-4 space-y-8">
          {/* Earnings Calculator */}
          <div className="bg-white/85 backdrop-blur-xl rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,29,0.06)] sticky top-12">
            <h3 className="text-lg font-headline font-bold mb-6">Earnings Calculator</h3>
            <div className="space-y-6">
              {/* Unit Price */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-secondary">
                  Unit Price (QAR)
                </label>
                <input
                  type="number"
                  value={calculatorPrice}
                  onChange={(e) => setCalculatorPrice(Number(e.target.value) || 0)}
                  className="bg-surface-container-high w-full h-14 px-5 text-lg font-bold border-none border-b-2 border-transparent focus:border-primary focus:outline-none rounded-t-sm transition-colors"
                />
              </div>

              {/* Percentage display */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-secondary">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  value={getCalculatorResult().pct}
                  readOnly
                  className="bg-surface-container-high w-full h-14 px-5 text-lg font-bold border-none rounded-t-sm opacity-70"
                />
              </div>

              {/* Result */}
              <div className="py-6 border-t border-outline-variant/15 mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-secondary font-medium">Worker Commission</span>
                  <span className="text-2xl font-headline font-extrabold text-primary">
                    {getCalculatorResult().commission.toFixed(2)} QAR
                  </span>
                </div>
                <div className="flex justify-between items-center opacity-60">
                  <span className="text-sm">Studio Net</span>
                  <span className="text-sm font-semibold">
                    {getCalculatorResult().net.toFixed(2)} QAR
                  </span>
                </div>
              </div>

              {/* Tip */}
              <div className="p-4 bg-tertiary-fixed rounded flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-on-tertiary-fixed-variant"
                  style={{ fontVariationSettings: "'opsz' 20" }}
                >
                  lightbulb
                </span>
                <p className="text-xs leading-relaxed text-on-tertiary-fixed-variant">
                  Rates are calculated based on the <strong>Net Price</strong> before taxes and
                  shipping costs are applied.
                </p>
              </div>
            </div>
          </div>

          {/* Global Averages */}
          <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <h4 className="text-[10px] font-bold tracking-[0.15em] uppercase text-secondary mb-6">
              Global Averages
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold">Avg. Commission</span>
                <span className="text-xl font-bold">{avgPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(avgPercentage * 4, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-sm font-semibold">Rates Configured</span>
                <span className="text-xl font-bold">
                  {Math.round((configuredCount / PIECE_TYPES.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full transition-all"
                  style={{
                    width: `${(configuredCount / PIECE_TYPES.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
