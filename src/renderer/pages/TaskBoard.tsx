import React, { useState, useEffect, useCallback } from 'react';
import StatusChip from '../components/StatusChip';

const TASK_TYPE_ICONS: Record<string, string> = {
  cutting: 'content_cut',
  sewing: 'styler',
  design: 'palette',
};

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ branchId?: number; workerId?: number; taskType?: string }>({});
  const [session, setSession] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const sess = await window.electronAPI.auth.getSession();
      setSession(sess);
      const effectiveFilters = { ...filters };
      if (sess?.role === 'manager') {
        effectiveFilters.branchId = sess.branch_id;
      }
      const [taskData, workerData, branchData] = await Promise.all([
        window.electronAPI.orders.getAllTasks(effectiveFilters),
        window.electronAPI.workers.getAll(),
        window.electronAPI.branches.getAll(),
      ]);
      setTasks(taskData || []);
      setWorkers(workerData || []);
      setBranches(branchData || []);
    } catch (err) {
      console.error('Failed to load task board:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().toISOString().split('T')[0];
  const isAdmin = session?.role === 'admin';

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== 'done').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading task board...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">Task Board</h1>
        <p className="text-secondary mt-1">Production overview across all orders</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6">
          <span className="text-xs font-bold tracking-widest uppercase text-secondary">Pending</span>
          <div className="text-3xl font-extrabold text-on-surface mt-2">{pendingCount}</div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6">
          <span className="text-xs font-bold tracking-widest uppercase text-secondary">In Progress</span>
          <div className="text-3xl font-extrabold text-primary mt-2">{inProgressCount}</div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6">
          <span className="text-xs font-bold tracking-widest uppercase text-secondary">Done</span>
          <div className="text-3xl font-extrabold text-primary mt-2">{doneCount}</div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6">
          <span className="text-xs font-bold tracking-widest uppercase text-secondary">Overdue</span>
          <div className="text-3xl font-extrabold text-error mt-2">{overdueCount}</div>
        </div>
      </div>

      <div className="flex gap-4">
        {isAdmin && (
          <select
            value={filters.branchId || ''}
            onChange={(e) => setFilters({ ...filters, branchId: e.target.value ? Number(e.target.value) : undefined })}
            className="input-field appearance-none min-w-[160px]"
          >
            <option value="">All Branches</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name_en || b.name_ar}</option>)}
          </select>
        )}
        <select
          value={filters.workerId || ''}
          onChange={(e) => setFilters({ ...filters, workerId: e.target.value ? Number(e.target.value) : undefined })}
          className="input-field appearance-none min-w-[160px]"
        >
          <option value="">All Workers</option>
          {workers.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select
          value={filters.taskType || ''}
          onChange={(e) => setFilters({ ...filters, taskType: e.target.value || undefined })}
          className="input-field appearance-none min-w-[160px]"
        >
          <option value="">All Types</option>
          <option value="cutting">Cutting</option>
          <option value="sewing">Sewing</option>
        </select>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-secondary">
          <span className="material-symbols-outlined text-5xl mb-3 text-outline">view_kanban</span>
          <p className="font-headline font-bold text-lg">No tasks found</p>
          <p className="text-sm mt-1">Create orders and assign tasks to see them here.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Piece</th>
                <th>Type</th>
                <th>Worker</th>
                <th>Due Date</th>
                {isAdmin && <th>Wage</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                return (
                  <tr key={task.task_id}>
                    <td className="font-bold">{task.order_number}</td>
                    <td>{task.customer_name || '--'}</td>
                    <td>{task.piece_type}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{TASK_TYPE_ICONS[task.task_type] || 'task'}</span>
                        <span className="capitalize">{task.task_type}</span>
                      </div>
                    </td>
                    <td>{task.worker_name || 'Unassigned'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{task.due_date || '--'}</span>
                        {isOverdue && <span className="px-2 py-0.5 bg-error-container text-on-error-container text-xs font-bold rounded-full">Overdue</span>}
                      </div>
                    </td>
                    {isAdmin && <td className="font-semibold">{Number(task.wage_amount || 0).toFixed(2)} QAR</td>}
                    <td>
                      <StatusChip status={task.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-surface-container-high text-sm text-secondary flex justify-between items-center">
            <p className="text-xs font-medium uppercase tracking-widest">
              Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
