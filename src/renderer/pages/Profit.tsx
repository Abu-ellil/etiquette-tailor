import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExpenseRow {
  id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  note: string | null;
  created_at?: string;
}

interface WorkerSummary {
  user_id: number;
  worker_name: string;
  worker_type: string | null;
  tasks_done: number;
  total_earnings: number;
  total_paid: number;
  balance: number;
  efficiency: number;
  total_assigned: number;
  in_progress: number;
  overdue: number;
}

interface OverdueTask {
  task_id: number;
  order_number: string;
  piece_type: string;
  task_type: string;
  due_date: string;
  customer_name?: string;
  worker_name?: string;
}

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

interface ProfitData {
  income: number;
  wagesPaid: number;
  otherExpenses: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: CategoryTotal[];
  overdueTasks: OverdueTask[];
  workerSummary: WorkerSummary[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'materials', label: 'Materials' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_ICONS: Record<string, string> = {
  rent: 'home',
  utilities: 'bolt',
  materials: 'category',
  fabric: 'checkroom',
  supplies: 'shopping_bag',
  other: 'more_horiz',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProfitPage() {
  const { t, currency } = useTranslation();

  // Date range — default to current month
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  });

  const [report, setReport] = useState<ProfitData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>(undefined);

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('rent');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expNote, setExpNote] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Payment modal
  const [paymentWorker, setPaymentWorker] = useState<WorkerSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Active section
  const [activeSection, setActiveSection] = useState<'summary' | 'workers' | 'expenses' | 'overdue'>('summary');

  /* ---- Data loading ---- */

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const [data, expData, branchData] = await Promise.all([
        window.electronAPI.expenses.getProfitReport(startDate, endDate, selectedBranch),
        window.electronAPI.expenses.getAll({ startDate, endDate, branchId: selectedBranch }),
        window.electronAPI.branches.getAll(),
      ]);
      setReport(data as ProfitData);
      setExpenses((expData || []) as ExpenseRow[]);
      setBranches(branchData || []);
    } catch (err) {
      console.error('Failed to load profit report:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch]);

  useEffect(() => { loadReport(); }, [loadReport]);

  /* ---- Expense CRUD ---- */

  const handleCreateExpense = async () => {
    if (!expAmount || Number(expAmount) <= 0) return;
    try {
      setExpSubmitting(true);
      await window.electronAPI.expenses.create({
        category: expCategory,
        description: expDescription || expCategory,
        amount: Number(expAmount),
        expense_date: expDate,
        branch_id: selectedBranch || null,
        note: expNote || null,
      });
      setShowExpenseModal(false);
      setExpDescription('');
      setExpAmount('');
      setExpNote('');
      await loadReport();
    } catch (err) {
      console.error('Failed to create expense:', err);
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm(t('Delete this expense?'))) return;
    try {
      await window.electronAPI.expenses.delete(id);
      await loadReport();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  /* ---- Worker Payment ---- */

  const handleRecordPayment = async () => {
    if (!paymentWorker || !paymentAmount || Number(paymentAmount) <= 0) return;
    try {
      setPaymentSubmitting(true);
      await window.electronAPI.workers.addPayment(
        paymentWorker.user_id,
        Number(paymentAmount),
        paymentNote || null,
      );
      setPaymentWorker(null);
      setPaymentAmount('');
      setPaymentNote('');
      await loadReport();
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* ---- Quick date presets ---- */

  const setThisMonth = () => {
    const now = new Date();
    setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    setEndDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`);
  };

  const setLastMonth = () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setStartDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`);
    setEndDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()).padStart(2, '0')}`);
  };

  const setThisYear = () => {
    const y = new Date().getFullYear();
    setStartDate(`${y}-01-01`);
    setEndDate(`${y}-12-31`);
  };

  /* ---- Section tabs ---- */

  const tabs: { key: typeof activeSection; label: string; icon: string }[] = [
    { key: 'summary', label: t('Summary'), icon: 'dashboard' },
    { key: 'workers', label: t('Workers'), icon: 'badge' },
    { key: 'expenses', label: t('Expenses'), icon: 'receipt_long' },
    { key: 'overdue', label: t('Overdue'), icon: 'warning' },
  ];

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        {t('Loading...')}
      </div>
    );
  }

  const data = report || { income: 0, wagesPaid: 0, otherExpenses: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: [], overdueTasks: [], workerSummary: [] };

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
          {t('Profit & Loss')}
        </h1>
        <p className="text-secondary mt-1 text-lg">
          {t('Track income, expenses, and net profit')}
        </p>
      </div>

      {/* ---- Date Range + Branch Filter ---- */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-1 bg-surface-container rounded-lg p-1">
          <button onClick={setThisMonth} className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
            {t('This Month')}
          </button>
          <button onClick={setLastMonth} className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
            {t('Last Month')}
          </button>
          <button onClick={setThisYear} className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
            {t('This Year')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm py-2" />
          <span className="text-secondary">{t('to')}</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm py-2" />
        </div>
        {branches.length > 1 && (
          <select
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : undefined)}
            className="input-field text-sm py-2 appearance-none pr-8"
          >
            <option value="">{t('All Branches')}</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name_en}</option>
            ))}
          </select>
        )}
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_20px_40px_rgba(25,28,29,0.03)] flex flex-col justify-between h-40">
          <span className="text-secondary font-headline text-xs font-bold uppercase tracking-widest">{t('Income')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-primary">{data.income.toFixed(0)}</span>
            <span className="text-secondary">{t(currency)}</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40">
          <span className="text-secondary font-headline text-xs font-bold uppercase tracking-widest">{t('Total Expenses')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-error">{data.totalExpenses.toFixed(0)}</span>
            <span className="text-secondary">{t(currency)}</span>
          </div>
          <p className="text-[10px] text-secondary mt-1">{t('Wages')}: {data.wagesPaid.toFixed(0)} | {t('Other')}: {data.otherExpenses.toFixed(0)}</p>
        </div>
        <div className={`p-8 rounded-xl flex flex-col justify-between h-40 ${data.netProfit >= 0 ? 'bg-primary-container text-white' : 'bg-error-container text-white'}`}>
          <span className={`font-headline text-xs font-bold uppercase tracking-widest ${data.netProfit >= 0 ? 'text-white/80' : 'text-white/80'}`}>{t('Net Profit')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold">{data.netProfit >= 0 ? '+' : ''}{data.netProfit.toFixed(0)}</span>
            <span className={`${data.netProfit >= 0 ? 'text-white/70' : 'text-white/70'}`}>{t(currency)}</span>
          </div>
        </div>
      </div>

      {/* ---- Section Tabs ---- */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex items-center gap-2 ${
              activeSection === tab.key
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
            {tab.key === 'overdue' && data.overdueTasks.length > 0 && (
              <span className="px-1.5 py-0.5 bg-error text-white text-[10px] font-bold rounded-full">{data.overdueTasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ==== SUMMARY SECTION ==== */}
      {activeSection === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense breakdown by category */}
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-container-high">
              <h2 className="text-lg font-headline font-bold text-on-surface">{t('Expense Breakdown')}</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Wages row */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">payments</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-on-surface">{t('Worker Wages')}</span>
                    <span className="font-bold text-primary">{data.wagesPaid.toFixed(0)} {t(currency)}</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${data.totalExpenses > 0 ? (data.wagesPaid / data.totalExpenses) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              {/* Category rows */}
              {data.expensesByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-lg">{CATEGORY_ICONS[cat.category] || 'more_horiz'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-on-surface">{t(cat.category)}</span>
                      <span className="font-bold text-on-surface">{cat.total.toFixed(0)} {t(currency)}</span>
                    </div>
                    <p className="text-[10px] text-secondary">{cat.count} {t('entries')}</p>
                  </div>
                </div>
              ))}
              {data.expensesByCategory.length === 0 && data.wagesPaid === 0 && (
                <p className="text-secondary text-sm text-center py-4">{t('No expenses in this period.')}</p>
              )}
            </div>
          </div>

          {/* Recent expenses */}
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-container-high flex justify-between items-center">
              <h2 className="text-lg font-headline font-bold text-on-surface">{t('Recent Expenses')}</h2>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {t('Add Expense')}
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline">receipt_long</span>
                <p className="text-sm">{t('No expenses recorded.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Date')}</th>
                      <th>{t('Category')}</th>
                      <th>{t('Description')}</th>
                      <th>{t('Amount')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="text-secondary text-sm">{exp.expense_date}</td>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-tertiary">{CATEGORY_ICONS[exp.category] || 'more_horiz'}</span>
                            <span className="capitalize text-sm">{t(exp.category)}</span>
                          </span>
                        </td>
                        <td className="text-sm">{exp.description}</td>
                        <td className="font-bold text-on-surface">{Number(exp.amount).toFixed(0)} {t(currency)}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-outline hover:text-error transition-colors p-1"
                            title={t('Delete')}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==== WORKERS SECTION ==== */}
      {activeSection === 'workers' && (
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-container-high">
            <h2 className="text-lg font-headline font-bold text-on-surface">{t('Worker Summary')}</h2>
            <p className="text-secondary text-xs mt-0.5">{t('Performance, earnings, and payments for the selected period')}</p>
          </div>
          {data.workerSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">badge</span>
              <p className="text-sm">{t('No workers found.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Worker')}</th>
                    <th>{t('Done')}</th>
                    <th>{t('In Progress')}</th>
                    <th>{t('Efficiency')}</th>
                    <th>{t('Earnings')}</th>
                    <th>{t('Paid')}</th>
                    <th>{t('Balance')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.workerSummary.map((w) => (
                    <tr key={w.user_id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
                            {w.worker_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{w.worker_name}</p>
                            <p className="text-xs text-secondary">
                              {w.worker_type === 'master_cutter' ? t('Master Cutter') : t('Tailor')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold">{w.tasks_done}</td>
                      <td>{w.in_progress}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full ${w.efficiency >= 80 ? 'bg-primary' : w.efficiency >= 50 ? 'bg-tertiary' : 'bg-error'}`}
                              style={{ width: `${w.efficiency}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${w.efficiency >= 80 ? 'text-primary' : w.efficiency >= 50 ? 'text-tertiary' : 'text-error'}`}>{w.efficiency}%</span>
                        </div>
                      </td>
                      <td className="font-semibold text-primary">{w.total_earnings.toFixed(0)} {t(currency)}</td>
                      <td className="text-on-surface">{w.total_paid.toFixed(0)} {t(currency)}</td>
                      <td>
                        <span className={`font-bold ${w.balance > 0 ? 'text-error' : 'text-on-surface'}`}>
                          {w.balance.toFixed(0)} {t(currency)}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setPaymentWorker(w);
                            setPaymentAmount('');
                            setPaymentNote('');
                          }}
                          className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">payments</span>
                          {t('Pay')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container font-bold">
                    <td>{t('Total')}</td>
                    <td>{data.workerSummary.reduce((s, w) => s + w.tasks_done, 0)}</td>
                    <td>{data.workerSummary.reduce((s, w) => s + w.in_progress, 0)}</td>
                    <td></td>
                    <td className="text-primary">{data.workerSummary.reduce((s, w) => s + w.total_earnings, 0).toFixed(0)} {t(currency)}</td>
                    <td>{data.workerSummary.reduce((s, w) => s + w.total_paid, 0).toFixed(0)} {t(currency)}</td>
                    <td className={data.workerSummary.reduce((s, w) => s + w.balance, 0) > 0 ? 'text-error' : ''}>
                      {data.workerSummary.reduce((s, w) => s + w.balance, 0).toFixed(0)} {t(currency)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==== EXPENSES SECTION ==== */}
      {activeSection === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="btn-primary flex items-center gap-2 py-3 px-6 text-sm"
            >
              <span className="material-symbols-outlined">add_circle</span>
              {t('Add Expense')}
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-secondary">
                <span className="material-symbols-outlined text-5xl mb-3 text-outline">receipt_long</span>
                <p className="font-headline font-bold text-lg">{t('No expenses found')}</p>
                <p className="text-sm mt-1">{t('Add your first expense to start tracking costs.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Date')}</th>
                      <th>{t('Category')}</th>
                      <th>{t('Description')}</th>
                      <th>{t('Note')}</th>
                      <th>{t('Amount')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="text-secondary text-sm">{exp.expense_date}</td>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-tertiary">{CATEGORY_ICONS[exp.category] || 'more_horiz'}</span>
                            <span className="capitalize text-sm">{t(exp.category)}</span>
                          </span>
                        </td>
                        <td className="text-sm">{exp.description}</td>
                        <td className="text-secondary text-sm">{exp.note || '--'}</td>
                        <td className="font-bold text-on-surface">{Number(exp.amount).toFixed(0)} {t(currency)}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-outline hover:text-error transition-colors p-1"
                            title={t('Delete')}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==== OVERDUE SECTION ==== */}
      {activeSection === 'overdue' && (
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-container-high">
            <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="text-error">{t('Overdue Tasks')}</span>
              <span className="px-2 py-0.5 bg-error/10 text-error text-xs font-bold rounded-full">{data.overdueTasks.length}</span>
            </h2>
          </div>
          {data.overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">check_circle</span>
              <p className="text-sm">{t('No overdue tasks. Everything is on track!')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Order')}</th>
                    <th>{t('Customer')}</th>
                    <th>{t('Piece')}</th>
                    <th>{t('Type')}</th>
                    <th>{t('Worker')}</th>
                    <th>{t('Due Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueTasks.map((task) => (
                    <tr key={task.task_id}>
                      <td className="font-semibold">{task.order_number}</td>
                      <td className="text-secondary">{task.customer_name || '--'}</td>
                      <td>{task.piece_type}</td>
                      <td>
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-xs font-bold rounded-full capitalize">
                          {t(task.task_type)}
                        </span>
                      </td>
                      <td>{task.worker_name || '--'}</td>
                      <td className="text-error font-semibold">{task.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- Add Expense Modal ---- */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-6 md:px-8 md:py-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-white">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-headline font-extrabold text-on-surface">{t('Add Expense')}</h2>
                      <p className="text-secondary text-xs mt-0.5">{t('Record a business expense')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowExpenseModal(false)} className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{t('Category')}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline">{CATEGORY_ICONS[expCategory] || 'more_horiz'}</span>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value)}
                        className="input-field pl-12 appearance-none"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{t(c.label)}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">expand_more</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{t('Description')}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline">description</span>
                      <input
                        type="text"
                        value={expDescription}
                        onChange={(e) => setExpDescription(e.target.value)}
                        className="input-field pl-12"
                        placeholder={t('e.g. Monthly rent payment')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{`${t('Amount')} (${t(currency)})`}</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline">payments</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          className="input-field pl-12"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{t('Date')}</label>
                      <input
                        type="date"
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{t('Note (optional)')}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline mt-[-2px]">note</span>
                      <input
                        type="text"
                        value={expNote}
                        onChange={(e) => setExpNote(e.target.value)}
                        className="input-field pl-12"
                        placeholder={t('Optional note...')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button onClick={() => setShowExpenseModal(false)} className="px-6 py-3 text-sm font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleCreateExpense}
                    disabled={expSubmitting || !expAmount || Number(expAmount) <= 0}
                    className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {expSubmitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                    {expSubmitting ? t('Saving...') : t('Save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Payment Modal ---- */}
      {paymentWorker && (
        <div className="modal-backdrop" onClick={() => setPaymentWorker(null)}>
          <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-6 md:px-8 md:py-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-headline font-extrabold text-on-surface">{t('Record Payment')}</h2>
                      <p className="text-secondary text-xs mt-0.5">{paymentWorker.worker_name}</p>
                    </div>
                  </div>
                  <button onClick={() => setPaymentWorker(null)} className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="bg-surface-container rounded-lg p-3 mb-4 text-xs">
                  <div className="flex justify-between"><span className="text-secondary">{t('Earnings')}</span><span className="font-semibold">{paymentWorker.total_earnings.toFixed(0)} {t(currency)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-secondary">{t('Paid')}</span><span className="font-semibold">{paymentWorker.total_paid.toFixed(0)} {t(currency)}</span></div>
                  <div className="flex justify-between mt-1 border-t border-outline-variant/20 pt-1"><span className="font-bold">{t('Balance')}</span><span className={`font-bold ${paymentWorker.balance > 0 ? 'text-error' : 'text-primary'}`}>{paymentWorker.balance.toFixed(0)} {t(currency)}</span></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{`${t('Amount')} (${t(currency)})`}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline">payments</span>
                      <input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input-field pl-12" placeholder="0.00" autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">{t('Note (optional)')}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline mt-[-2px]">note</span>
                      <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="input-field pl-12" placeholder={t('e.g. March salary, advance payment...')} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button onClick={() => setPaymentWorker(null)} className="px-6 py-3 text-sm font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">{t('Cancel')}</button>
                  <button onClick={handleRecordPayment} disabled={paymentSubmitting || !paymentAmount || Number(paymentAmount) <= 0} className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50">
                    {paymentSubmitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                    {paymentSubmitting ? t('Saving...') : t('Record Payment')}
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
