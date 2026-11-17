import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Label } from '../components/ui.jsx';
import AIAssist from './AIAssist.jsx';
import { skillName } from '../lib/skills.js';

/** Chips input for a list of skills. Enter / comma adds; paste of "a, b, c" adds all. */
export function TagsInput({ label, value = [], onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const parts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const lower = value.map((v) => v.toLowerCase());
    const next = [...value, ...parts.filter((p, i) => !lower.includes(p.toLowerCase()) && parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i)];
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };
  const unused = suggestions.map(skillName).filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 10);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-sm">
            {t}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500" aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(draft); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
          onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[,\n]/.test(t)) { e.preventDefault(); add(t); } }}
          placeholder={value.length ? '' : 'React, Node.js, MongoDB…'}
          className="min-w-[8rem] flex-1 border-none bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">Suggested for your role:</span>
          {unused.map((s) => <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-xs text-slate-500 hover:border-brand-500 hover:text-brand-600">+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

const autoGrow = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

/** Editable list of bullet points, each with its own AI button. */
export function BulletsEditor({ label, value = [''], onChange, context }) {
  const bullets = value.length ? value : [''];
  const set = (i, v) => onChange(bullets.map((b, j) => (j === i ? v : b)));
  const move = (i, d) => {
    const next = [...bullets];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const replaceWithMany = (i, many) => onChange([...bullets.slice(0, i), ...many, ...bullets.slice(i + 1)]);

  return (
    <div>
      <Label hint="Start with an action verb, add numbers">{label}</Label>
      <div className="space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="group flex items-start gap-1.5">
            <span className="mt-2.5 text-slate-400">•</span>
            <textarea
              ref={autoGrow}
              rows={1}
              value={b}
              onChange={(e) => { set(i, e.target.value); autoGrow(e.target); }}
              placeholder={i === 0 ? 'Built a … using … that resulted in … (or type rough notes and use AI → Convert to bullet points)' : 'Another achievement…'}
              className="min-h-[38px] flex-1 resize-none overflow-hidden rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex items-center gap-0.5 pt-1.5">
              <AIAssist text={b} context={context} modes={['improve', 'bullets', 'verbs', 'grammar']} onApply={(v) => set(i, v)} onApplyBullets={(many) => replaceWithMany(i, many)} />
              <div className="flex opacity-0 transition group-hover:opacity-100">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === bullets.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => onChange(bullets.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Delete bullet"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...bullets, ''])} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><Plus className="h-3.5 w-3.5" /> Add bullet</button>
    </div>
  );
}
