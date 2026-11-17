import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea, cx } from '../components/ui.jsx';
import { ITEM_FIELDS, emptyItem, itemLabel } from '../lib/resume.js';
import { BulletsEditor, TagsInput } from './fields.jsx';
import AIAssist from './AIAssist.jsx';
import { useEditor } from './EditorContext.jsx';

const ADD_LABEL = { education: 'education', experience: 'experience / internship', projects: 'project', skills: 'skill group', certifications: 'certification', achievements: 'achievement', activities: 'activity' };

/** Generic editor for any repeatable section (education, projects, …) driven by ITEM_FIELDS. */
export default function ListSection({ section, items = [], onChange }) {
  const { role } = useEditor();
  const [open, setOpen] = useState(() => (items[0]?.id ? { [items[0].id]: true } : {}));
  const fields = ITEM_FIELDS[section];

  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i, d) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const add = () => {
    const it = emptyItem(section);
    onChange([...items, it]);
    setOpen((o) => ({ ...o, [it.id]: true }));
  };

  // Suggest role skills not yet used anywhere in the skills section
  const skillSuggestions = section === 'skills' && role ? [...role.coreSkills, ...role.niceToHave] : [];

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const key = item.id || i;
        const isOpen = open[key] ?? false;
        return (
          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-400 transition', !isOpen && '-rotate-90')} />
                <span className="truncate text-sm font-medium text-slate-700">{itemLabel(section, item, i)}</span>
              </button>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-white disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-white disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
            {isOpen && (
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-3">
                {fields.map((f) => {
                  const cls = f.full ? 'col-span-2' : 'col-span-2 sm:col-span-1';
                  const val = item[f.key];
                  const ctx = `${section} entry "${itemLabel(section, item, i)}"${item.tech ? `, tech: ${item.tech}` : ''}`;
                  if (f.type === 'bullets') return <div key={f.key} className={cls}><BulletsEditor label={f.label} value={val} context={ctx} onChange={(v) => update(i, { [f.key]: v })} /></div>;
                  if (f.type === 'tags') return <div key={f.key} className={cls}><TagsInput label={f.label} value={val} suggestions={skillSuggestions} onChange={(v) => update(i, { [f.key]: v })} /></div>;
                  if (f.type === 'select') return <Select key={f.key} className={cls} label={f.label} options={f.options} value={val ?? ''} onChange={(e) => update(i, { [f.key]: e.target.value })} />;
                  if (f.type === 'textarea') {
                    return (
                      <div key={f.key} className={cx(cls, 'relative')}>
                        <Textarea label={f.label} rows={2} placeholder={f.placeholder} value={val || ''} onChange={(e) => update(i, { [f.key]: e.target.value })} />
                        {section !== 'education' && <div className="absolute right-0 top-0"><AIAssist text={val} context={ctx} onApply={(v) => update(i, { [f.key]: v })} /></div>}
                      </div>
                    );
                  }
                  return <Input key={f.key} className={cls} label={f.label} placeholder={f.placeholder} value={val || ''} onChange={(e) => update(i, { [f.key]: e.target.value })} />;
                })}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-brand-500 hover:bg-brand-50/50 hover:text-brand-600">
        <Plus className="h-4 w-4" /> Add {ADD_LABEL[section]}
      </button>
    </div>
  );
}
