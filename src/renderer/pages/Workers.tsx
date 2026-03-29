import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Worker {
  id: number;
  name: string;
  username: string;
  role: string;
  worker_type?: 'tailor' | 'cutter' | 'designer' | null;
  branch_id: number;
  base_salary: number;
  active: number;
  created_at?: string;
}

interface WorkerFormValues {
  name: string;
  username: string;
  password: string;
  worker_type: string;
  branch_id: number;
  base_salary: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  'bg-secondary-container text-on-secondary-container',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-outline-variant text-on-surface-variant',
  'bg-surface-container-high text-on-surface-variant',
];

const WORKER_TYPE_ICONS: Record<string, string> = {
  tailor: 'styler',
  cutter: 'content_cut',
  designer: 'palette',
};

const WORKER_TYPE_LABELS: Record<string, string> = {
  tailor: 'Tailor',
  cutter: 'Cutter',
  designer: 'Designer',
};

const EMPLOYMENT_BADGES: Record<string, { bg: string; text: string }> = {
  permanent: {
    bg: 'bg-tertiary-fixed',
    text: 'text-on-tertiary-fixed',
  },
  seasonal: {
    bg: 'bg-primary-fixed',
    text: 'text-on-primary-fixed',
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function getPaymentLabel(worker: Worker): { icon: string; label: string } {
  if (worker.base_salary > 0) {
    return { icon: 'account_balance_wallet', label: 'Fixed Salary' };
  }
  return { icon: 'percent', label: 'Piece-rate' };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkerFormValues>();

  /* ---- Data loading ---- */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [workersData, branchesData] = await Promise.all([
        window.electronAPI.workers.getAll(),
        window.electronAPI.branches.getAll(),
      ]);
      setWorkers(workersData || []);
      setBranches(branchesData || []);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Derived stats ---- */

  const activeCount = workers.filter((w) => w.active === 1).length;
  const totalCount = workers.length;
  const permanentCount = workers.filter((w) => w.base_salary > 0).length;
  const seasonalCount = totalCount - permanentCount;

  /* ---- Modal helpers ---- */

  const openAddModal = () => {
    setEditingWorker(null);
    reset({
      name: '',
      username: '',
      password: '',
      worker_type: 'tailor',
      branch_id: branches.length > 0 ? branches[0].id : 1,
      base_salary: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    reset({
      name: worker.name,
      username: worker.username,
      password: '',
      worker_type: worker.worker_type || 'tailor',
      branch_id: worker.branch_id,
      base_salary: worker.base_salary || 0,
    });
    setModalOpen(true);
    setActionMenuId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWorker(null);
    reset({
      name: '',
      username: '',
      password: '',
      worker_type: 'tailor',
      branch_id: 1,
      base_salary: 0,
    });
  };

  /* ---- Form submit ---- */

  const onSubmit = async (data: WorkerFormValues) => {
    try {
      if (editingWorker) {
        const updateData: any = {
          name: data.name,
          worker_type: data.worker_type || null,
          branch_id: data.branch_id,
          base_salary: Number(data.base_salary) || 0,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await window.electronAPI.users.update(editingWorker.id, updateData);
      } else {
        await window.electronAPI.users.create({
          name: data.name,
          username: data.username,
          password: data.password,
          role: 'worker',
          worker_type: data.worker_type || null,
          branch_id: data.branch_id,
          base_salary: Number(data.base_salary) || 0,
        });
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error('Failed to save worker:', err);
    }
  };

  /* ---- Deactivate ---- */

  const handleDeactivate = async (worker: Worker) => {
    if (
      !window.confirm(
        `Deactivate worker "${worker.name}"? They will no longer appear in the active list.`,
      )
    )
      return;
    try {
      await window.electronAPI.users.deactivate(worker.id);
      await loadData();
    } catch (err) {
      console.error('Failed to deactivate worker:', err);
    }
    setActionMenuId(null);
  };

  /* ---- Click-away for action menu ---- */

  useEffect(() => {
    if (actionMenuId === null) return;
    const handler = () => setActionMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuId]);

  /* ---- Render ---- */

  return (
    <div className="space-y-10">
      {/* ---- Header ---- */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
            Workers
          </h1>
          <p className="text-secondary mt-1 text-lg">
            Manage your artisan team and seasonal specialists.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-3 py-4 px-11 text-sm shadow-xl hover:opacity-90 transition-opacity active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span>
          Add Worker
        </button>
      </div>

      {/* ---- Stats Overview ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Active Force */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_20px_40px_rgba(25,28,29,0.03)] flex flex-col justify-between h-40">
          <span className="text-secondary font-headline text-xs font-bold uppercase tracking-widest">
            Active Force
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-primary">{activeCount}</span>
            <span className="text-secondary font-medium">Artisans</span>
          </div>
        </div>

        {/* Production Type */}
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40">
          <span className="text-secondary font-headline text-xs font-bold uppercase tracking-widest">
            Production Type
          </span>
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-on-surface">{permanentCount}</span>
              <span className="text-[10px] text-secondary uppercase font-bold tracking-tighter">
                Permanent
              </span>
            </div>
            <div className="w-px h-full bg-outline-variant/30" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-on-surface">{seasonalCount}</span>
              <span className="text-[10px] text-secondary uppercase font-bold tracking-tighter">
                Seasonal
              </span>
            </div>
          </div>
        </div>

        {/* Payout Cycle */}
        <div className="bg-primary-container p-8 rounded-xl text-white flex flex-col justify-between h-40">
          <span className="text-white/80 font-headline text-xs font-bold uppercase tracking-widest">
            Total Workforce
          </span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl">badge</span>
            <span className="text-xl font-bold">{totalCount} Workers</span>
          </div>
        </div>
      </div>

      {/* ---- Workers Table ---- */}
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined animate-spin mr-2">
              progress_activity
            </span>
            Loading workers...
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 text-outline">badge</span>
            <p className="font-headline font-bold text-on-surface text-lg">No workers found</p>
            <p className="text-sm mt-1">Add your first worker to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Employment Type</th>
                <th>Payment Structure</th>
                <th>Join Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => {
                const payment = getPaymentLabel(worker);
                const empType = worker.base_salary > 0 ? 'permanent' : 'seasonal';
                const badge = EMPLOYMENT_BADGES[empType];
                const typeIcon =
                  WORKER_TYPE_ICONS[worker.worker_type || 'tailor'] || 'badge';

                return (
                  <tr key={worker.id}>
                    {/* Name + Avatar */}
                    <td>
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(worker.id)}`}
                        >
                          {getInitials(worker.name)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{worker.name}</p>
                          <p className="text-xs text-secondary">
                            {WORKER_TYPE_LABELS[worker.worker_type || 'tailor'] || 'Worker'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Employment Type */}
                    <td>
                      <span
                        className={`px-3 py-1 ${badge.bg} ${badge.text} text-[11px] font-bold uppercase rounded-full`}
                      >
                        {empType}
                      </span>
                    </td>

                    {/* Payment Structure */}
                    <td>
                      <div className="flex items-center gap-2 text-on-surface-variant font-medium">
                        <span className="material-symbols-outlined text-lg opacity-40">
                          {payment.icon}
                        </span>
                        {payment.label}
                      </div>
                    </td>

                    {/* Join Date */}
                    <td className="text-secondary text-sm">
                      {formatDate(worker.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(
                              actionMenuId === worker.id ? null : worker.id,
                            );
                          }}
                          className="text-outline hover:text-primary transition-colors p-1"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>

                        {actionMenuId === worker.id && (
                          <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 z-50 min-w-[160px] py-1">
                            <button
                              onClick={() => openEditModal(worker)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                              Edit Worker
                            </button>
                            <button
                              onClick={() => handleDeactivate(worker)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors flex items-center gap-2 text-error"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                              Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table Footer */}
        {workers.length > 0 && (
          <div className="px-6 py-4 border-t border-surface-container-high text-sm text-secondary flex justify-between items-center">
            <p className="text-xs font-medium uppercase tracking-widest">
              Showing {workers.length} artisan{workers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ---- Add / Edit Modal ---- */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="flex min-h-full items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-content w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-10">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
                      {editingWorker ? 'Edit Worker' : 'New Worker'}
                    </h2>
                    <p className="text-secondary text-sm mt-1">
                      {editingWorker
                        ? 'Update worker information and assignment.'
                        : 'Add a new artisan to the Etiquette Studio team.'}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Name */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      Full Name
                    </label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      type="text"
                      className={`input-field ${errors.name ? 'border-b-error' : ''}`}
                      placeholder="e.g. Ahmad Ali / أحمد علي"
                    />
                    {errors.name && (
                      <p className="text-error text-xs mt-1 ml-4">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Username */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      Username
                    </label>
                    <input
                      {...register('username', {
                        required: !editingWorker ? 'Username is required' : false,
                      })}
                      type="text"
                      className={`input-field ${errors.username ? 'border-b-error' : ''}`}
                      placeholder="Login username"
                      disabled={!!editingWorker}
                    />
                    {errors.username && (
                      <p className="text-error text-xs mt-1 ml-4">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      {editingWorker ? 'New Password (leave blank to keep)' : 'Password'}
                    </label>
                    <input
                      {...register('password', {
                        required: !editingWorker ? 'Password is required' : false,
                      })}
                      type="password"
                      className={`input-field ${errors.password ? 'border-b-error' : ''}`}
                      placeholder={editingWorker ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                    />
                    {errors.password && (
                      <p className="text-error text-xs mt-1 ml-4">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Worker Type + Branch (side by side) */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                        Specialty
                      </label>
                      <select {...register('worker_type')} className="input-field">
                        <option value="tailor">Tailor</option>
                        <option value="cutter">Cutter</option>
                        <option value="designer">Designer</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                        Branch
                      </label>
                      <select {...register('branch_id', { valueAsNumber: true })} className="input-field">
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Base Salary */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      Base Salary (0 = piece-rate worker)
                    </label>
                    <input
                      {...register('base_salary', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-8 py-4 text-sm font-semibold text-secondary hover:text-on-surface transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-10 py-4 text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSubmitting
                        ? 'Saving...'
                        : editingWorker
                          ? 'Update Worker'
                          : 'Create Worker'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
