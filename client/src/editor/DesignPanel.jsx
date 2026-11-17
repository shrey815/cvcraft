import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { ACCENTS, FONTS, SECTION_TITLES, TEMPLATES, sectionTitle } from '../lib/resume.js';
import { Card, Label, Select, cx } from '../components/ui.jsx';
import { useEditor } from './EditorContext.jsx';

function TemplateThumb({ id, accent }) {
  const line = (w, y, c = '#cbd5e1', h = 3) => <rect x={id === 'modern' ? 30 : 8} y={y} width={w} height={h} rx="1.5" fill={c} />;
  return (
    <svg viewBox="0 0 84 110" className="h-full w-full">
      <rect width="84" height="110" fill="#fff" />
      {id === 'modern' && <rect width="24" height="110" fill={accent} />}
      {id === 'classic' && <><rect x="22" y="8" width="40" height="5" rx="2" fill="#334155" /><rect x="16" y="16" width="52" height="2.5" rx="1" fill="#94a3b8" /></>}
      {id === 'minimal' && <><rect x="8" y="8" width="36" height="5" rx="2" fill="#334155" /><rect x="8" y="16" width="56" height="2.5" rx="1" fill="#94a3b8" /></>}
      {id === 'modern' && <><rect x="4" y="8" width="16" height="4" rx="1.5" fill="#fff" /><rect x="4" y="30" width="14" height="2" fill="#ffffffaa" /><rect x="4" y="35" width="16" height="2" fill="#ffffffaa" /><rect x="4" y="40" width="12" height="2" fill="#ffffffaa" /></>}
      {[26, 52, 78].map((y) => (
        <g key={y}>
          {id === 'minimal' ? <rect x="8" y={y} width="12" height="3" rx="1" fill={accent} /> : line(22, y, accent)}
          {id === 'classic' && <rect x="8" y={y + 4.5} width="68" height="0.8" fill={accent} />}
          {id === 'minimal' ? <><rect x="26" y={y} width="50" height="2.5" fill="#cbd5e1" /><rect x="26" y={y + 5} width="44" height="2.5" fill="#cbd5e1" /><rect x="26" y={y + 10} width="48" height="2.5" fill="#cbd5e1" /></> : <>{line(id === 'modern' ? 46 : 68, y + 8)}{line(id === 'modern' ? 40 : 60, y + 13)}{line(id === 'modern' ? 44 : 64, y + 18)}</>}
        </g>
      ))}
    </svg>
  );
}

export default function DesignPanel({ resume, update }) {
  const { role } = useEditor();
  const d = resume.design || {};
  const setDesign = (patch) => update({ design: { ...d, ...patch } });
  const order = resume.sectionOrder || [];
  const hidden = resume.hiddenSections || [];

  const move = (i, dir) => {
    const next = [...order];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    update({ sectionOrder: next });
  };
  const toggleHidden = (k) => update({ hiddenSections: hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k] });
  const rename = (k, v) => update({ sectionTitles: { ...(resume.sectionTitles || {}), [k]: v } });

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <Label>Template</Label>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => update({ template: t.id })} className={cx('rounded-xl border p-2 text-left transition', resume.template === t.id ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
              <div className="aspect-[84/110] overflow-hidden rounded-md border border-slate-100"><TemplateThumb id={t.id} accent={d.accent || '#1d4ed8'} /></div>
              <p className="mt-2 text-sm font-semibold">{t.name}</p>
              <p className="text-[11px] leading-snug text-slate-500">{t.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="grid grid-cols-2 gap-4 p-4">
        <Select label="Font" value={d.font || 'Inter'} onChange={(e) => setDesign({ font: e.target.value })} options={FONTS} />
        <Select label="Spacing" value={d.spacing || 'normal'} onChange={(e) => setDesign({ spacing: e.target.value })} options={[{ value: 'compact', label: 'Compact (fit 1 page)' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]} />
        <label className="col-span-2 block">
          <Label hint={`${d.fontSize || 10.5} pt`}>Font size</Label>
          <input type="range" min="9" max="12" step="0.25" value={d.fontSize || 10.5} onChange={(e) => setDesign({ fontSize: Number(e.target.value) })} className="w-full accent-brand-600" />
        </label>
        <div className="col-span-2">
          <Label>Accent colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((c) => (
              <button key={c} type="button" onClick={() => setDesign({ accent: c })} className={cx('h-7 w-7 rounded-full ring-offset-2 transition', d.accent === c && 'ring-2 ring-slate-400')} style={{ background: c }} aria-label={`Accent ${c}`} />
            ))}
            <input type="color" value={d.accent || '#1d4ed8'} onChange={(e) => setDesign({ accent: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-200" title="Custom colour" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Section order & visibility</Label>
          {role && (
            <button type="button" onClick={() => update({ sectionOrder: role.sectionOrder })} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <RotateCcw className="h-3 w-3" /> Use recommended order for {role.name}
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {order.map((k, i) => (
            <div key={k} className={cx('flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5', hidden.includes(k) && 'bg-slate-50 opacity-60')}>
              <span className="w-5 text-center text-xs text-slate-400">{i + 1}</span>
              <input value={sectionTitle(resume, k)} onChange={(e) => rename(k, e.target.value)} placeholder={SECTION_TITLES[k]} className="min-w-0 flex-1 rounded border-none bg-transparent px-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-brand-200" title="Click to rename" />
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === order.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => toggleHidden(k)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label={hidden.includes(k) ? 'Show section' : 'Hide section'}>{hidden.includes(k) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">Empty sections are left out of the CV automatically. Click a name to rename it.</p>
      </Card>
    </div>
  );
}
