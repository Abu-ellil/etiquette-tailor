interface StatusChipProps {
  status: string;
  onClick?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
};

export default function StatusChip({ status, onClick }: StatusChipProps) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';
  const label = STATUS_LABELS[status] || status;

  if (onClick) {
    return (
      <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-bold ${style} cursor-pointer`}>
        {label}
      </button>
    );
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}
