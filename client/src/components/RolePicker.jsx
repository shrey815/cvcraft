import { cx } from './ui.jsx';

/** Grid of target roles grouped by category. */
export default function RolePicker({ roles, value, onChange }) {
  const groups = [...new Set(roles.map((r) => r.category))];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</p>
          <div className="grid grid-cols-2 gap-2">
            {roles.filter((r) => r.category === g).map((r) => (
              <button key={r.id} type="button" onClick={() => onChange(r.id)} className={cx('rounded-lg border px-3 py-2 text-left text-sm transition', value === r.id ? 'border-brand-600 bg-brand-50 font-medium text-brand-700 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
