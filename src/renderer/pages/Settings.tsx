import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  worker_type?: string | null;
  branch_id: number;
  base_salary: number;
  active: number;
}

interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  prefix: string;
  address?: string;
}

interface UserFormValues {
  name: string;
  username: string;
  password: string;
  role: string;
  worker_type: string;
  branch_id: number;
  base_salary: number;
}

interface BranchFormValues {
  name_ar: string;
  name_en: string;
  prefix: string;
  address: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'shop', label: 'Shop Info', icon: 'storefront' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'branches', label: 'Branches', icon: 'store' },
  { id: 'preferences', label: 'Preferences', icon: 'tune' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  reception: 'Reception',
  worker: 'Worker',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-fixed', text: 'text-on-primary-fixed' },
  manager: { bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
  reception: { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' },
  worker: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('shop');
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const [settings, setSettingsState] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number; up: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>();

  const {
    register: regBranch,
    handleSubmit: submitBranch,
    reset: resetBranch,
    formState: { errors: branchErrors, isSubmitting: branchSubmitting },
  } = useForm<BranchFormValues>();

  /* ---- Data loading ---- */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsData, usersData, branchesData] = await Promise.all([
        window.electronAPI.settings.getAll(),
        window.electronAPI.users.getAll(),
        window.electronAPI.branches.getAll(),
      ]);
      setSettingsState(settingsData || {});
      setUsers(usersData || []);
      setBranches(branchesData || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Click-away for action menu ---- */

  useEffect(() => {
    if (actionMenuId === null) return;
    const handler = () => setActionMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuId]);

  /* ---- Shop Info save ---- */

  const handleShopSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const updates: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      updates[key] = value as string;
    }
    try {
      setSaving(true);
      await window.electronAPI.settings.set(updates);
      setSettingsState((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Failed to save shop info:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Preferences save ---- */

  const handlePrefsSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const updates: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      updates[key] = value as string;
    }
    try {
      setSaving(true);
      await window.electronAPI.settings.set(updates);
      setSettingsState((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ---- User modal ---- */

  const openAddUser = () => {
    setEditingUser(null);
    reset({
      name: '',
      username: '',
      password: '',
      role: 'reception',
      worker_type: 'tailor',
      branch_id: branches.length > 0 ? branches[0].id : 1,
      base_salary: 0,
    });
    setUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    reset({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      worker_type: user.worker_type || 'tailor',
      branch_id: user.branch_id,
      base_salary: user.base_salary || 0,
    });
    setUserModalOpen(true);
    setActionMenuId(null);
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const onUserSubmit = async (data: UserFormValues) => {
    try {
      if (editingUser) {
        const updateData: any = {
          name: data.name,
          role: data.role,
          worker_type: data.role === 'worker' ? data.worker_type || null : null,
          branch_id: data.branch_id,
          base_salary: Number(data.base_salary) || 0,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await window.electronAPI.users.update(editingUser.id, updateData);
      } else {
        await window.electronAPI.users.create({
          name: data.name,
          username: data.username,
          password: data.password,
          role: data.role,
          worker_type: data.role === 'worker' ? data.worker_type || null : null,
          branch_id: data.branch_id,
          base_salary: Number(data.base_salary) || 0,
        });
      }
      closeUserModal();
      await loadData();
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!window.confirm(t('Deactivate user "{name}"?').replace('{name}', user.name))) return;
    try {
      await window.electronAPI.users.deactivate(user.id);
      await loadData();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
    setActionMenuId(null);
  };

  /* ---- Branch modal ---- */

  const openAddBranch = () => {
    setEditingBranch(null);
    resetBranch({ name_ar: '', name_en: '', prefix: '', address: '' });
    setBranchModalOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    resetBranch({
      name_ar: branch.name_ar,
      name_en: branch.name_en,
      prefix: branch.prefix,
      address: branch.address || '',
    });
    setBranchModalOpen(true);
  };

  const closeBranchModal = () => {
    setBranchModalOpen(false);
    setEditingBranch(null);
  };

  const onBranchSubmit = async (data: BranchFormValues) => {
    try {
      if (editingBranch) {
        await window.electronAPI.branches.update(editingBranch.id, {
          name_ar: data.name_ar,
          name_en: data.name_en,
          prefix: data.prefix,
          address: data.address || null,
        });
      } else {
        await window.electronAPI.branches.create({
          name_ar: data.name_ar,
          name_en: data.name_en,
          prefix: data.prefix,
          address: data.address || null,
        });
      }
      closeBranchModal();
      await loadData();
    } catch (err) {
      console.error('Failed to save branch:', err);
    }
  };

  /* ---- Render helpers ---- */

  const watchedRole = editingUser?.role;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        {t('Loading settings...')}
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-3">
          {t('Settings')}
        </h1>
        <p className="text-lg text-secondary max-w-2xl leading-relaxed">
          {t('Manage your shop info, user accounts, branches, and system preferences.')}
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-10 border-b border-surface-container-high pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-headline font-bold tracking-wide uppercase transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'shop' && (
        <form onSubmit={handleShopSave} className="max-w-2xl space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">storefront</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">{t('Shop Details')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Shop Name (Arabic)')}
                </label>
                <input
                  name="shop_name_ar"
                  type="text"
                  className="input-field"
                  defaultValue={settings.shop_name_ar || ''}
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Shop Name (English)')}
                </label>
                <input
                  name="shop_name_en"
                  type="text"
                  className="input-field"
                  defaultValue={settings.shop_name_en || ''}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                {t('Phone Number')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">phone</span>
                <input
                  name="shop_phone"
                  type="tel"
                  className="input-field pl-12"
                  defaultValue={settings.shop_phone || ''}
                  placeholder="+974 XXXX XXXX"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              )}
              {saving ? t('Saving...') : t('Save Changes')}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openAddUser}
              className="btn-primary flex items-center gap-3 py-3 px-8 text-sm shadow-xl hover:opacity-90 active:scale-95"
            >
              <span className="material-symbols-outlined">person_add</span>
              {t('Add User')}
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-secondary">
                <span className="material-symbols-outlined text-5xl mb-3 text-outline">group</span>
                <p className="font-headline font-bold text-on-surface text-lg">{t('No users found')}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Name')}</th>
                    <th>{t('Username')}</th>
                    <th>{t('Role')}</th>
                    <th>{t('Branch')}</th>
                    <th>{t('Status')}</th>
                    <th className="text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.worker;
                    const branch = branches.find((b) => b.id === user.branch_id);
                    return (
                      <tr key={user.id}>
                        <td>
                          <span className="font-bold text-on-surface">{user.name}</span>
                          {user.role === 'worker' && user.worker_type && (
                            <span className="text-xs text-secondary ml-2">
                              ({user.worker_type === 'master_cutter' ? 'Master Cutter' : user.worker_type === 'tailor' ? 'Tailor' : user.worker_type})
                            </span>
                          )}
                        </td>
                        <td className="text-secondary text-sm">{user.username}</td>
                        <td>
                          <span
                            className={`px-3 py-1 ${roleColor.bg} ${roleColor.text} text-[11px] font-bold uppercase rounded-full`}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="text-sm">{branch?.name_en || '--'}</td>
                        <td>
                          <span
                            className={`px-3 py-1 text-[11px] font-bold uppercase rounded-full ${
                              user.active
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {user.active ? t('Active') : t('Inactive')}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (actionMenuId === user.id) {
                                  setActionMenuId(null);
                                  setActionMenuPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const up = window.innerHeight - rect.bottom < 120;
                                  setActionMenuPos({
                                    top: up ? rect.top - 4 : rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                    up,
                                  });
                                  setActionMenuId(user.id);
                                }
                              }}
                              className="text-outline hover:text-primary transition-colors p-1"
                            >
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>
                            {actionMenuId === user.id && actionMenuPos && (
                              <div
                                className="fixed bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 z-50 min-w-[160px] py-1"
                                style={{
                                  top: actionMenuPos.top,
                                  right: actionMenuPos.right,
                                  transform: actionMenuPos.up ? 'translateY(-100%)' : undefined,
                                }}
                              >
                                <button
                                  onClick={() => openEditUser(user)}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                  {t('Edit User')}
                                </button>
                                {user.active && (
                                  <button
                                    onClick={() => handleDeactivateUser(user)}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors flex items-center gap-2 text-error"
                                  >
                                    <span className="material-symbols-outlined text-base">person_remove</span>
                                    {t('Deactivate')}
                                  </button>
                                )}
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
            {users.length > 0 && (
              <div className="px-6 py-4 border-t border-surface-container-high text-xs font-medium uppercase tracking-widest text-secondary">
                {users.length} {t('user(s)')}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openAddBranch}
              className="btn-primary flex items-center gap-3 py-3 px-8 text-sm shadow-xl hover:opacity-90 active:scale-95"
            >
              <span className="material-symbols-outlined">add_business</span>
              {t('Add Branch')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="bg-surface-container-lowest rounded-2xl p-8 border-b-4 border-primary shadow-[0px_20px_40px_rgba(25,28,29,0.04)]"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-primary text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        store
                      </span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-on-surface text-lg">
                        {branch.name_en}
                      </h4>
                      <p className="text-sm text-secondary" dir="rtl">
                        {branch.name_ar}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed text-sm font-bold rounded-full">
                    {branch.prefix}-XXX
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    {branch.address || t('No address set')}
                  </div>
                </div>

                <button
                  onClick={() => openEditBranch(branch)}
                  className="text-primary font-headline font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  {t('Edit Branch')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <form onSubmit={handlePrefsSave} className="max-w-2xl space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">{t('System Preferences')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Theme')}
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline">
                    {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                  </span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                    className="input-field pl-12 appearance-none"
                  >
                    <option value="light">{t('Light')}</option>
                    <option value="dark">{t('Dark')}</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Language')}
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline">
                    translate
                  </span>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'ar')}
                    className="input-field pl-12 appearance-none"
                  >
                    <option value="en">{t('English')}</option>
                    <option value="ar">{t('Arabic')}</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Currency')}
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline">paid</span>
                  <select
                    name="currency"
                    className="input-field pl-12 appearance-none"
                    defaultValue={settings.currency || 'QAR'}
                  >
                    <option value="QAR">QAR - Qatari Riyal</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                  {t('Tax Rate (%)')}
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline">percent</span>
                  <input
                    name="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="input-field pl-12"
                    defaultValue={settings.tax_rate || '0'}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                {t('Receipt / Invoice Footer Text')}
              </label>
              <textarea
                name="receipt_footer"
                rows={3}
                className="input-field resize-none"
                defaultValue={settings.receipt_footer || ''}
                placeholder="Text shown at the bottom of printed invoices"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              )}
              {saving ? t('Saving...') : t('Save Preferences')}
            </button>
          </div>
        </form>
      )}

      {/* ---- User Modal ---- */}
      {userModalOpen && (
        <div className="modal-backdrop" onClick={closeUserModal}>
          <div
            className="flex min-h-full items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-6 md:px-8 md:py-8">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-white">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {editingUser ? 'edit' : 'person_add'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
                        {editingUser ? t('Edit User') : t('New User')}
                      </h2>
                      <p className="text-secondary text-xs mt-0.5">
                        {editingUser ? t('Update user information') : t('Create a new user account')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeUserModal}
                    className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onUserSubmit)} className="space-y-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-lg">badge</span>
                      <span className="text-xs font-headline font-bold uppercase tracking-widest text-secondary">
                        {t('Account Information')}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                        {t('Full Name')}
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline">person</span>
                        <input
                          {...register('name', { required: 'Name is required' })}
                          type="text"
                          className={`input-field pl-12 ${errors.name ? '!border-b-error' : ''}`}
                          placeholder="e.g. Ahmad Ali"
                        />
                      </div>
                      {errors.name && (
                        <p className="text-error text-xs mt-1 ml-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                          {t('Username')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-4 text-outline">alternate_email</span>
                          <input
                            {...register('username', {
                              required: !editingUser ? 'Username is required' : false,
                            })}
                            type="text"
                            className={`input-field pl-12 ${errors.username ? '!border-b-error' : ''}`}
                            placeholder="Login ID"
                            disabled={!!editingUser}
                          />
                        </div>
                        {errors.username && (
                          <p className="text-error text-xs mt-1 ml-1">{errors.username.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                          {editingUser ? t('New Password') : t('Password')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-4 text-outline">lock</span>
                          <input
                            {...register('password', {
                              required: !editingUser ? 'Password is required' : false,
                            })}
                            type={showPassword ? 'text' : 'password'}
                            className={`input-field pl-12 pr-12 ${errors.password ? '!border-b-error' : ''}`}
                            placeholder={editingUser ? 'Leave blank to keep' : 'Min 6 characters'}
                          />
                          <button
                            type="button"
                            className="absolute right-4 text-outline hover:text-primary transition-colors"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            <span className="material-symbols-outlined">
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-error text-xs mt-1 ml-1">{errors.password.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-outline-variant/20" />

                  {/* Role & Work Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
                      <span className="text-xs font-headline font-bold uppercase tracking-widest text-secondary">
                        {t('Role & Assignment')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                          {t('Role')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-4 text-outline">shield</span>
                          <select
                            {...register('role')}
                            className="input-field pl-12 appearance-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="reception">Reception</option>
                            <option value="worker">Worker</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                            expand_more
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                          {t('Branch')}
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-4 text-outline">store</span>
                          <select
                            {...register('branch_id', { valueAsNumber: true })}
                            className="input-field pl-12 appearance-none"
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name_en}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Conditional: worker_type only when role=worker */}
                    {(watchedRole === 'worker' || (!editingUser)) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                            {t('Worker Specialty')}
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-4 text-outline">styler</span>
                            <select
                              {...register('worker_type')}
                              className="input-field pl-12 appearance-none"
                            >
                              <option value="tailor">Tailor</option>
                              <option value="master_cutter">Master Cutter</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 text-outline pointer-events-none text-lg">
                              expand_more
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                            {t('Base Salary')}
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-4 text-outline">payments</span>
                            <input
                              {...register('base_salary', { valueAsNumber: true })}
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-field pl-12"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeUserModal}
                      className="px-6 py-3 text-sm font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting && (
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      )}
                      {isSubmitting ? t('Saving...') : editingUser ? t('Update User') : t('Create User')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Branch Modal ---- */}
      {branchModalOpen && (
        <div className="modal-backdrop" onClick={closeBranchModal}>
          <div
            className="flex min-h-full items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-6 md:px-8 md:py-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-white">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {editingBranch ? 'edit' : 'add_business'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
                        {editingBranch ? t('Edit Branch') : t('New Branch')}
                      </h2>
                      <p className="text-secondary text-xs mt-0.5">
                        {editingBranch ? t('Update branch details') : t('Add a new workshop location')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeBranchModal}
                    className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={submitBranch(onBranchSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                      {t('Branch Name (Arabic)')}
                    </label>
                    <input
                      {...regBranch('name_ar', { required: 'Arabic name is required' })}
                      type="text"
                      dir="rtl"
                      className={`input-field ${branchErrors.name_ar ? '!border-b-error' : ''}`}
                      placeholder="اسم الفرع"
                    />
                    {branchErrors.name_ar && (
                      <p className="text-error text-xs mt-1 ml-1">{branchErrors.name_ar.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                      {t('Branch Name (English)')}
                    </label>
                    <input
                      {...regBranch('name_en', { required: 'English name is required' })}
                      type="text"
                      className={`input-field ${branchErrors.name_en ? '!border-b-error' : ''}`}
                      placeholder="Branch name in English"
                    />
                    {branchErrors.name_en && (
                      <p className="text-error text-xs mt-1 ml-1">{branchErrors.name_en.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                      {t('Order Prefix')}
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline">tag</span>
                      <input
                        {...regBranch('prefix', { required: 'Prefix is required' })}
                        type="text"
                        maxLength={3}
                        className={`input-field pl-12 uppercase ${branchErrors.prefix ? '!border-b-error' : ''}`}
                        placeholder="e.g. C"
                      />
                    </div>
                    {branchErrors.prefix && (
                      <p className="text-error text-xs mt-1 ml-1">{branchErrors.prefix.message}</p>
                    )}
                    <p className="text-on-surface-variant text-[11px] mt-1.5 ml-1">
                      {t('Orders will be numbered: {prefix}-001, {prefix}-002, etc.', { prefix: editingBranch?.prefix || 'C' })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1">
                      {t('Address')}
                    </label>
                    <input
                      {...regBranch('address')}
                      type="text"
                      className="input-field"
                      placeholder="Street / area"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeBranchModal}
                      className="px-6 py-3 text-sm font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={branchSubmitting}
                      className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {branchSubmitting && (
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      )}
                      {branchSubmitting ? t('Saving...') : editingBranch ? t('Update Branch') : t('Create Branch')}
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
