import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ListPlus, SpellCheck, Sparkles, Wand2, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import { Button, Modal, Spinner } from '../components/ui.jsx';
import { useEditor } from './EditorContext.jsx';

const MODES = {
  improve: { label: 'Improve writing', icon: Wand2, desc: 'Stronger, more professional versions' },
  bullets: { label: 'Convert to bullet points', icon: ListPlus, desc: 'Turn rough notes into CV bullets' },
  verbs: { label: 'Suggest action verbs', icon: Zap, desc: 'Better opening verbs for this line' },
  grammar: { label: 'Fix grammar & spelling', icon: SpellCheck, desc: 'Corrects mistakes, keeps your meaning' }
};

/**
 * Small "AI" button that opens a menu of writing actions for one piece of text.
 * onApply(text) replaces the text; onApplyBullets(array) is used by the "bullets" mode.
 */
export default function AIAssist({ text, onApply, onApplyBullets, modes = ['improve', 'verbs', 'grammar'], context }) {
  const { role, aiEnabled } = useEditor();
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => !ref.current?.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const run = async (m) => {
    setMenu(false);
    if (!text?.trim()) return toast('Write something first, even rough notes.');
    setMode(m);
    setResult(null);
    if (!aiEnabled) {
      // Offline fallback: role-specific verbs still work without Gemini
      if (m === 'verbs') return setResult({ verbs: role?.actionVerbs || [], offline: true });
      setMode(null);
      return toast.error('AI is not configured on the server (GEMINI_API_KEY).');
    }
    setLoading(true);
    try {
      setResult(await api.post('/ai/assist', { mode: m, text, context, roleId: role?.id }));
    } catch (e) {
      toast.error(e.message);
      setMode(null);
    } finally {
      setLoading(false);
    }
  };

  const apply = (value) => {
    onApply(value);
    setMode(null);
    toast.success('Applied');
  };

  const replaceFirstWord = (verb) => apply(text.trim().replace(/^\S+/, verb));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setMenu((v) => !v)} className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100" title="AI writing assistant">
        <Sparkles className="h-3.5 w-3.5" /> AI
      </button>
      {menu && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {modes.map((m) => {
            const { label, icon: Icon, desc } = MODES[m];
            return (
              <button key={m} type="button" onClick={() => run(m)} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <span><span className="block text-sm font-medium text-slate-800">{label}</span><span className="block text-xs text-slate-500">{desc}</span></span>
              </button>
            );
          })}
          {!aiEnabled && <p className="px-2.5 py-1.5 text-[11px] text-amber-600">AI key not set on server: only action verbs work offline.</p>}
        </div>
      )}

      <Modal open={Boolean(mode)} onClose={() => setMode(null)} title={mode ? MODES[mode].label : ''}>
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="text-xs font-semibold uppercase text-slate-400">Your text</span><p className="mt-1 whitespace-pre-wrap">{text}</p></div>
        {loading && <div className="flex items-center gap-3 py-6 text-sm text-slate-500"><Spinner className="h-5 w-5" /> Thinking…</div>}

        {result?.suggestions?.length > 0 && (
          <div className="space-y-2">
            {result.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <p className="flex-1 text-sm">{s}</p>
                <Button size="sm" variant="soft" onClick={() => apply(s)}><Check className="h-3.5 w-3.5" /> Use</Button>
              </div>
            ))}
          </div>
        )}

        {result?.bullets?.length > 0 && (
          <div>
            <ul className="space-y-2">{result.bullets.map((b, i) => <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">• {b}</li>)}</ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => apply(result.bullets[0])}>Use first only</Button>
              <Button onClick={() => { (onApplyBullets || ((b) => onApply(b.join('\n'))))(result.bullets); setMode(null); toast.success('Bullets added'); }}>Use all {result.bullets.length}</Button>
            </div>
          </div>
        )}

        {result?.verbs?.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-slate-500">Click a verb to replace the first word of your text{result.offline ? ' (suggestions for your target role)' : ''}.</p>
            <div className="flex flex-wrap gap-2">
              {result.verbs.map((v) => <button key={v} onClick={() => replaceFirstWord(v)} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700 hover:bg-violet-100">{v}</button>)}
            </div>
            {result.example && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <p className="flex-1 text-sm">{result.example}</p>
                <Button size="sm" variant="soft" onClick={() => apply(result.example)}><Check className="h-3.5 w-3.5" /> Use</Button>
              </div>
            )}
          </div>
        )}

        {result?.corrected && (
          <div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">{result.corrected}</div>
            {result.changes?.length > 0 && <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-slate-500">{result.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}
            {result.corrected.trim() === text.trim() && <p className="mt-2 text-sm text-emerald-700">No mistakes found.</p>}
            <div className="mt-4 flex justify-end"><Button onClick={() => apply(result.corrected)}>Apply correction</Button></div>
          </div>
        )}

        {result?.tip && <p className="mt-4 text-xs text-slate-500">💡 {result.tip}</p>}
        {result && <p className="mt-4 text-[11px] text-slate-400">Placeholders like [X%] mean the AI did not know the number. Replace them with your real figures, don't invent them.</p>}
      </Modal>
    </div>
  );
}
