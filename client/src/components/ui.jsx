import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100'
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...props }) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60', VARIANTS[variant], sizes[size], className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Label({ children, hint }) {
  return (
    <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-slate-600">
      {children}
      {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </span>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function Input({ label, hint, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <Label hint={hint}>{label}</Label>}
      <input {...props} className={inputCls} />
    </label>
  );
}

export function Textarea({ label, hint, className, rows = 3, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <Label hint={hint}>{label}</Label>}
      <textarea rows={rows} {...props} className={cx(inputCls, 'resize-y leading-relaxed')} />
    </label>
  );
}

export function Select({ label, options, className, ...props }) {
  return (
    <label className={cx('block', className)}>
      {label && <Label>{label}</Label>}
      <select {...props} className={inputCls}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}

export function Card({ className, children }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-6 w-6 animate-spin text-brand-600', className)} />;
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div className={cx('max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl scroll-thin', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className, color }) {
  const c = color || (value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500');
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cx('h-full rounded-full transition-all duration-500', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ScoreRing({ score, size = 96 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="700" fill="#0f172a">{score}</text>
    </svg>
  );
}

export function Badge({ children, tone = 'slate', className }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    blue: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

export function Logo({ className }) {
  return (
    <span className={cx('flex items-center gap-2 font-bold text-slate-900', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
        <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 9h10M9 14h14M9 19h14M9 24h8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
      </span>
      CVCraft
    </span>
  );
}

export { cx };
