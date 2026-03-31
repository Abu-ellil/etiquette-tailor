import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from '../contexts/I18nContext';

/* ── Types ─────────────────────────────────────────────── */

interface Customer {
  id: number;
  name: string;
  phone: string;
  notes: string;
  branch_id: number;
  is_deleted?: number;
}

interface CustomerFormValues {
  name: string;
  phone: string;
  notes: string;
}

/* ── Avatar helpers ────────────────────────────────────── */

const AVATAR_COLORS = [
  'bg-secondary-container text-on-secondary-container',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-outline-variant text-on-surface-variant',
  'bg-surface-container-high text-on-surface-variant',
];

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  // Detect Arabic: if the string contains Arabic letters, take the first two chars
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }

  // Latin / other: first letter of first word + first letter of last word
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/* ── Component ─────────────────────────────────────────── */

export default function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>();

  /* ── Data fetching ── */

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.customers.getAll();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /* ── Search ── */

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim()) {
        try {
          const results = await window.electronAPI.customers.search(searchQuery.trim());
          setCustomers(results || []);
        } catch (err) {
          console.error('Search failed:', err);
        }
      } else {
        loadCustomers();
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, loadCustomers]);

  /* ── Modal helpers ── */

  const openAddModal = () => {
    setEditingCustomer(null);
    reset({ name: '', phone: '', notes: '' });
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    reset({ name: customer.name, phone: customer.phone || '', notes: customer.notes || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    reset({ name: '', phone: '', notes: '' });
  };

  /* ── Form submit ── */

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (editingCustomer) {
        await window.electronAPI.customers.update(editingCustomer.id, {
          name: data.name,
          phone: data.phone,
          notes: data.notes,
        });
      } else {
        await window.electronAPI.customers.create({
          name: data.name,
          phone: data.phone,
          notes: data.notes,
        });
      }
      closeModal();
      await loadCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
  };

  /* ── Delete ── */

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(t('customers.confirm.delete').replace('{name}', customer.name))) return;
    try {
      await window.electronAPI.customers.delete(customer.id);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  /* ── Render ── */

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
            {t('customers.pageTitle')}
          </h1>
          <p className="text-secondary mt-1 text-sm">
            {t('customers.pageSubtitle')}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 py-4 px-10 text-sm shadow-xl hover:opacity-90 transition-opacity active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span>
          {t('customers.addCustomer')}
        </button>
      </div>

      {/* ── Search ── */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">
            {t('customers.quickSearch')}
          </label>
          <div className="relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12"
              placeholder={t('customers.searchPlaceholder')}
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              search
            </span>
          </div>
        </div>
      </div>

      {/* ── Customer Table ── */}
      <div className="bg-surface-container-lowest overflow-x-auto rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            {t('customers.loading')}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 text-outline">group</span>
            <p className="font-headline font-bold text-on-surface text-lg">{t('customers.noCustomersFound')}</p>
            <p className="text-sm mt-1">
              {searchQuery ? t('customers.noCustomersSearch') : t('customers.noCustomersEmpty')}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('customers.table.name')}</th>
                <th>{t('customers.table.phone')}</th>
                <th>{t('customers.table.notes')}</th>
                <th className="text-right">{t('customers.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  {/* Name + Avatar */}
                  <td>
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(customer.id)}`}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-on-surface">
                          {customer.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td>
                    {customer.phone ? (
                      <span className="text-base font-headline font-bold text-primary tracking-tight">
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="text-outline text-sm">--</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="max-w-md">
                    {customer.notes ? (
                      <p className="text-secondary text-sm line-clamp-1 italic">
                        {customer.notes}
                      </p>
                    ) : (
                      <span className="text-outline text-sm">{t('customers.noNotes')}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(customer)}
                        className="p-2 text-outline hover:text-primary transition-colors"
                        title={t('customers.editCustomer')}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-2 text-outline hover:text-error transition-colors"
                        title={t('customers.deleteCustomer')}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Table Footer */}
        {customers.length > 0 && (
          <div className="px-6 py-4 border-t border-surface-container-high text-sm text-secondary">
            {t('customers.showing').replace('{count}', String(customers.length))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="flex min-h-full items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-6 md:px-8 md:py-10">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
                      {editingCustomer ? t('customers.modal.editTitle') : t('customers.modal.newTitle')}
                    </h2>
                    <p className="text-secondary text-sm mt-1">
                      {editingCustomer
                        ? t('customers.modal.editSubtitle')
                        : t('customers.modal.newSubtitle')}
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
                      {t('customers.form.fullName')}
                    </label>
                    <input
                      {...register('name', { required: t('customers.form.nameRequired') })}
                      type="text"
                      className={`input-field ${errors.name ? 'border-b-error' : ''}`}
                      placeholder={t('customers.form.namePlaceholder')}
                    />
                    {errors.name && (
                      <p className="text-error text-xs mt-1 ml-4">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      {t('customers.form.phoneNumber')}
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="input-field"
                      placeholder={t('customers.form.phonePlaceholder')}
                    />
                  </div>

                  {/* Notes */}
                  <div className="relative">
                    <label className="absolute -top-2 left-4 px-1 bg-surface-container-lowest text-xs font-semibold text-secondary uppercase tracking-widest z-10">
                      {t('customers.form.tailoringNotes')}
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={5}
                      className="input-field h-auto py-4 pt-6 resize-none"
                      placeholder={t('customers.form.notesPlaceholder')}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-8 py-4 text-sm font-semibold text-secondary hover:text-on-surface transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-10 py-4 text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSubmitting
                        ? t('common.saving')
                        : editingCustomer
                          ? t('customers.form.updateProfile')
                          : t('customers.form.createProfile')}
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
