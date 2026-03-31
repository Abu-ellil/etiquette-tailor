import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusChip from '../components/StatusChip';
import { useTranslation } from '../contexts/I18nContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = React.useState<any>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [measurements, setMeasurements] = React.useState<any>(null);
  const [workers, setWorkers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [showAddTask, setShowAddTask] = React.useState(false);
  const [originalPrice, setOriginalPrice] = React.useState(0);
  const [newTask, setNewTask] = React.useState({ task_type: 'sewing', assigned_to: null });

  const loadOrder = React.useCallback(async () => {
    try {
      setLoading(true);
      const [orderData, taskData, measData, workerData] = await Promise.all([
        window.electronAPI.orders.get(Number(id)),
        window.electronAPI.orders.getTasks(Number(id)),
        window.electronAPI.orders.getMeasurements(Number(id)),
        window.electronAPI.workers.getAll(),
      ]);
      setOrder(orderData);
      setTasks(taskData || []);
      setMeasurements(measData);
      setWorkers(workerData || []);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleStatusChange = async (taskId: number, currentStatus: string) => {
    const next: string | undefined = {
      pending: 'in_progress',
      in_progress: 'done',
    }[currentStatus];
    if (!next) return;
    await window.electronAPI.orders.updateTaskStatus(taskId, next);
    await loadOrder();
  };

  const handleSaveOrder = async () => {
    if (!order) return;
    try {
      await window.electronAPI.orders.update(order.id, {
        customer_id: order.customer_id,
        piece_type: order.piece_type,
        details: order.details,
        price: Number(order.price),
        paid: Number(order.paid),
        payment_method: order.payment_method,
        status: order.status,
        delivery_date: order.delivery_date,
      });
      const newPrice = Number(order.price);
      if (newPrice !== originalPrice) {
        const nonDoneTasks = tasks.filter((t: any) => t.status !== 'done');
        if (nonDoneTasks.length > 0) {
          const recalc = window.confirm(
            t('Price changed from {oldPrice} QAR to {newPrice} QAR. This will recalculate wages for {count} task(s). Proceed?', {
              oldPrice: originalPrice.toFixed(2),
              newPrice: newPrice.toFixed(2),
              count: nonDoneTasks.length,
            })
          );
          if (recalc) {
            await window.electronAPI.orders.recalculateTaskWages(order.id, newPrice);
          }
        }
      }
      setEditing(false);
      await loadOrder();
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  const handleSaveMeasurements = async () => {
    if (!measurements) return;
    try {
      await window.electronAPI.orders.updateMeasurements(Number(id), measurements);
      await loadOrder();
    } catch (err) {
      console.error('Failed to save measurements:', err);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.assigned_to || !order) return;
    try {
      const rate = await window.electronAPI.workers.getActiveRate(newTask.assigned_to, order.piece_type);
      if (!rate) {
        alert(t('No rate configured for this worker and piece type. Please set the rate in Worker Rates first.'));
        return;
      }
      const wageAmount = rate.wage_type === 'percentage'
        ? Number(order.price) * (rate.rate / 100)
        : rate.rate;
      await window.electronAPI.orders.createTask({
        order_id: Number(id),
        task_type: newTask.task_type,
        assigned_to: newTask.assigned_to,
        wage_type: rate.wage_type,
        wage_rate: rate.rate,
        wage_amount: wageAmount,
        status: 'pending',
      });
      setShowAddTask(false);
      setNewTask({ task_type: 'sewing', assigned_to: null });
      await loadOrder();
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleReassign = async (taskId: number, newWorkerId: number) => {
    try {
      const rate = await window.electronAPI.workers.getActiveRate(newWorkerId, order.piece_type);
      if (!rate) return;
      const wageAmount = rate.wage_type === 'percentage'
        ? Number(order.price) * (rate.rate / 100)
        : rate.rate;
      await window.electronAPI.orders.reassignTask(
        taskId, newWorkerId, rate.wage_type, rate.rate, wageAmount
      );
      await loadOrder();
    } catch (err) {
      console.error('Failed to reassign task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        {t('Loading order...')}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-secondary">
        <span className="material-symbols-outlined text-5xl mb-3 text-outline">error</span>
        <p className="font-headline font-bold text-lg">{t('Order not found')}</p>
        <button onClick={() => navigate('/orders')} className="btn-primary mt-4 px-6 py-2 text-sm">{t('Back to Orders')}</button>
      </div>
    );
  }

  const balance = (Number(order.price) || 0) - (Number(order.paid) || 0);

  const [session, setSession] = React.useState<any>(null);
  React.useEffect(() => {
    window.electronAPI.auth.getSession().then((s: any) => setSession(s));
  }, []);
  const isWorker = session?.role === 'worker';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">
            {t('Order #{number}', { number: order.order_number })}
          </h1>
          <p className="text-secondary mt-1">
            {order.customer_name} {order.customer_phone && `· ${order.customer_phone}`}
          </p>
        </div>
        <div className="flex gap-3">
          {!isWorker && (
            !editing ? (
              <button onClick={() => { setEditing(true); setOriginalPrice(Number(order.price)); }} className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">edit</span>
                {t('Edit Order')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); loadOrder(); }} className="px-6 py-3 text-sm text-secondary hover:bg-surface-container-high rounded-lg">{t('Cancel')}</button>
                <button onClick={handleSaveOrder} className="btn-primary px-6 py-3 text-sm">{t('Save')}</button>
              </div>
            )
          )}
          <button onClick={() => navigate('/orders')} className="px-4 py-3 text-sm text-secondary hover:bg-surface-container-high rounded-lg flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {t('Back')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6">
            <h3 className="text-lg font-headline font-bold mb-4">{t('Order Details')}</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Piece Type')}</label>
                  <input value={order.piece_type} onChange={(e) => setOrder({...order, piece_type: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Status')}</label>
                  <select value={order.status} onChange={(e) => setOrder({...order, status: e.target.value})} className="input-field w-full appearance-none">
                    <option value="intake">{t('Intake')}</option>
                    <option value="cutting">{t('Cutting')}</option>
                    <option value="sewing">{t('Sewing')}</option>
                    <option value="ready">{t('Ready')}</option>
                    <option value="delivered">{t('Delivered')}</option>
                  </select>
                </div>
                {!isWorker && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Price (QAR)')}</label>
                      <input type="number" value={order.price} onChange={(e) => setOrder({...order, price: e.target.value})} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Paid (QAR)')}</label>
                      <input type="number" value={order.paid} onChange={(e) => setOrder({...order, paid: e.target.value})} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Balance')}</label>
                      <input readOnly value={balance.toFixed(2)} className="input-field w-full opacity-60" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Payment')}</label>
                      <select value={order.payment_method} onChange={(e) => setOrder({...order, payment_method: e.target.value})} className="input-field w-full appearance-none">
                        <option value="cash">{t('Cash')}</option>
                        <option value="card">{t('Card')}</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Due Date')}</label>
                  <input type="date" value={order.delivery_date || ''} onChange={(e) => setOrder({...order, delivery_date: e.target.value})} className="input-field w-full" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Details')}</label>
                  <textarea value={order.details || ''} onChange={(e) => setOrder({...order, details: e.target.value})} className="input-field w-full min-h-[80px]" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div><span className="text-secondary">{t('Piece Type')}:</span> <span className="font-semibold">{order.piece_type}</span></div>
                <div><span className="text-secondary">{t('Status')}:</span> <StatusChip status={order.status} /></div>
                {!isWorker && (<>
                  <div><span className="text-secondary">{t('Price')}:</span> <span className="font-semibold">{Number(order.price).toFixed(2)} QAR</span></div>
                  <div><span className="text-secondary">{t('Paid')}:</span> <span className="font-semibold">{Number(order.paid).toFixed(2)} QAR</span></div>
                  <div><span className="text-secondary">{t('Balance')}:</span> <span className="font-semibold text-primary">{balance.toFixed(2)} QAR</span></div>
                  <div><span className="text-secondary">{t('Payment')}:</span> <span className="font-semibold capitalize">{order.payment_method}</span></div>
                </>)}
                <div><span className="text-secondary">{t('Due Date')}:</span> <span className="font-semibold">{order.delivery_date || '--'}</span></div>
                <div><span className="text-secondary">{t('Details')}:</span> <span className="font-semibold">{order.details || '--'}</span></div>
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6">
            <h3 className="text-lg font-headline font-bold mb-4">{t('Measurements')}</h3>
            {measurements ? (
              <div className="grid grid-cols-3 gap-4">
                {['chest', 'waist', 'hips', 'length', 'sleeve', 'shoulder'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t(`${field.charAt(0).toUpperCase() + field.slice(1)}`)}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={measurements[field] || ''}
                      onChange={(e) => setMeasurements({...measurements, [field]: e.target.value ? Number(e.target.value) : null})}
                      className="input-field w-full"
                      placeholder="--"
                    />
                  </div>
                ))}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Notes')}</label>
                  <textarea value={measurements.notes || ''} onChange={(e) => setMeasurements({...measurements, notes: e.target.value})} className="input-field w-full min-h-[60px]" />
                </div>
                <div className="col-span-3 flex justify-end">
                  <button onClick={handleSaveMeasurements} className="btn-primary px-6 py-2 text-sm">{t('Save Measurements')}</button>
                </div>
              </div>
            ) : (
              <p className="text-secondary text-sm">{t('No measurements recorded for this order.')}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6">
            <h3 className="text-lg font-headline font-bold mb-3">{t('Tasks')}</h3>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-secondary text-sm py-4">{t('No tasks assigned yet.')}</p>
              ) : tasks.map((task: any) => (
                <div key={task.id} className="bg-surface rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm capitalize">{task.task_type}</span>
                    <StatusChip status={task.status} onClick={() => handleStatusChange(task.id, task.status)} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-secondary">
                    <span>{t('Worker:')}: {task.worker_name || t('Unassigned')}</span>
                    {!isWorker && <span>{t('Wage:')} {Number(task.wage_amount || 0).toFixed(2)} QAR</span>}
                  </div>
                  {task.started_at && <div className="text-xs text-secondary">{t('Started:')} {new Date(task.started_at).toLocaleString()}</div>}
                  {task.completed_at && <div className="text-xs text-secondary">{t('Completed:')} {new Date(task.completed_at).toLocaleString()}</div>}
                </div>
              ))}
            </div>
            <button onClick={() => setShowAddTask(true)} className="mt-4 w-full py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-base">add</span>
              {t('Add Task')}
            </button>
          </div>
        </div>
      </div>

      {showAddTask && (
        <div className="modal-backdrop" onClick={() => setShowAddTask(false)}>
          <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-6">
                <h2 className="text-xl font-headline font-bold mb-4">{t('Add Task')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Task Type')}</label>
                    <select value={newTask.task_type} onChange={(e) => setNewTask({...newTask, task_type: e.target.value})} className="input-field w-full appearance-none">
                      <option value="cutting">{t('Cutting')}</option>
                      <option value="sewing">{t('Sewing')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{t('Assign Worker')}</label>
                    <select value={newTask.assigned_to || ''} onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value ? Number(e.target.value) : null})} className="input-field w-full appearance-none">
                      <option value="">{t('Select worker...')}</option>
                      {workers.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-sm text-secondary">{t('Cancel')}</button>
                  <button onClick={handleAddTask} disabled={!newTask.assigned_to} className="btn-primary px-6 py-2 text-sm disabled:opacity-50">{t('Add Task')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
