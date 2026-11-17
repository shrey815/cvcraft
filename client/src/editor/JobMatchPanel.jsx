import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownUp, Check, Lightbulb, Plus, Search, Sparkles, Target } from 'lucide-react';
import { api } from '../lib/api.js';
import { uid } from '../lib/resume.js';
import { skillName as pretty } from '../lib/skills.js';
import { Badge, Button, Card, Label, Modal, Select, Spinner, Textarea } from '../components/ui.jsx';
import { useEditor } from './EditorContext.jsx';


export default function JobMatchPanel({ resume, update, analysis, analyzing, runAnalysis }) {
  const { roles, role, aiEnabled } = useEditor();
  const [tailoring, setTailoring] = useState(false);
  const [tailor, setTailor] = useState(null);
  const [applied, setApplied] = useState({});

  const addSkill = (kw) => {
    const skills = [...(resume.skills || [])];
    const label = pretty(kw);
    if (skills.some((g) => (g.items || []).some((s) => s.toLowerCase() === kw))) return;
    if (skills.length) skills[0] = { ...skills[0], items: [...(skills[0].items || []), label] };
    else skills.push({ id: uid(), category: 'Skills', items: [label] });
    update({ skills });
    toast.success(`Added "${label}" to ${skills[0].category || 'Skills'}`);
  };

  const reorderProjects = () => {
    const order = analysis.projectRanking.map((p) => p.index);
    update({ projects: order.map((i) => resume.projects[i]) });
    toast.success('Projects reordered by relevance');
    setTimeout(runAnalysis, 50);
  };

  const runTailor = async () => {
    if (!aiEnabled) return toast.error('AI is not configured on the server (GEMINI_API_KEY).');
    setTailoring(true);
    try {
      setApplied({});
      setTailor(await api.post('/ai/tailor', { resume, roleId: role?.id, jobDescription: resume.jobDescription }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTailoring(false);
    }
  };

  const applyRewrite = (rw) => {
    const [section, i, j] = rw.ref.split('.');
    const list = [...resume[section]];
    const item = { ...list[+i], bullets: [...list[+i].bullets] };
    item.bullets[+j] = rw.improved;
    list[+i] = item;
    update({ [section]: list });
    setApplied((a) => ({ ...a, [rw.ref]: true }));
  };

  const orderDiffers = analysis && analysis.suggestedSectionOrder.join() !== (resume.sectionOrder || []).join();
  const projectsOutOfOrder = analysis?.projectRanking?.some((p, i) => p.index !== i);

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <Select label="Target role" value={resume.targetRole} onChange={(e) => update({ targetRole: e.target.value })} options={roles.map((r) => ({ value: r.id, label: `${r.name}` }))} />
        <Textarea
          label="Job description"
          hint="optional, but gives the best results"
          rows={7}
          placeholder="Paste the full job description from LinkedIn, Naukri, Internshala or the company careers page…"
          value={resume.jobDescription || ''}
          onChange={(e) => update({ jobDescription: e.target.value })}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={runAnalysis} loading={analyzing}><Search className="h-4 w-4" /> Analyse match</Button>
          <Button variant="soft" onClick={runTailor} loading={tailoring} disabled={!analysis}><Sparkles className="h-4 w-4" /> AI: tailor my bullets</Button>
        </div>
      </Card>

      {!analysis && !analyzing && <p className="px-1 text-sm text-slate-500">Choose a role (and ideally paste a job description), then click <b>Analyse match</b>.</p>}
      {analyzing && !analysis && <div className="grid place-items-center py-10"><Spinner /></div>}

      {analysis && (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-brand-600" /> Keyword match</h3>
              <Badge tone={analysis.breakdown.keywords >= 70 ? 'green' : analysis.breakdown.keywords >= 45 ? 'amber' : 'red'}>{analysis.breakdown.keywords}% match</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">Compared against {analysis.keywordSource === 'job-description' ? 'keywords found in the job description' : `the typical skills for ${analysis.role.name} (paste a JD for a precise match)`}.</p>

            <Label>
              <span className="mt-4 block">Found in your CV ({analysis.keywords.matched.length})</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.matched.length ? analysis.keywords.matched.map((k) => <Badge key={k} tone="green"><Check className="h-3 w-3" /> {pretty(k)}</Badge>) : <span className="text-xs text-slate-400">None yet</span>}
            </div>

            {analysis.keywords.missing.length > 0 && (
              <>
                <Label><span className="mt-4 block">Missing ({analysis.keywords.missing.length}): click to add to Skills, only if you genuinely have it</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.keywords.missing.map((m) => (
                    <button key={m.keyword} onClick={() => addSkill(m.keyword)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 transition hover:bg-rose-100 ${m.important ? 'bg-rose-50 text-rose-700 ring-rose-300' : 'bg-white text-rose-600 ring-rose-200'}`}>
                      <Plus className="h-3 w-3" /> {pretty(m.keyword)}{m.important && ' ★'}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">★ = appears often in the job description / core skill for the role</p>
              </>
            )}

            {analysis.keywords.notInSkills.length > 0 && (
              <>
                <Label><span className="mt-4 block">Mentioned in projects but missing from Skills</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.keywords.notInSkills.map((k) => (
                    <button key={k} onClick={() => addSkill(k)} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"><Plus className="h-3 w-3" /> {pretty(k)}</button>
                  ))}
                </div>
              </>
            )}
          </Card>

          {analysis.projectRanking.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Which projects to highlight</h3>
                {projectsOutOfOrder && <Button size="sm" variant="soft" onClick={reorderProjects}><ArrowDownUp className="h-3.5 w-3.5" /> Reorder by relevance</Button>}
              </div>
              <div className="mt-3 space-y-2">
                {analysis.projectRanking.map((p, rank) => (
                  <div key={p.index} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{rank + 1}. {p.name}</span>
                      <Badge tone={p.relevance >= 3 ? 'green' : p.relevance >= 1 ? 'amber' : 'red'}>{p.relevance} match{p.relevance === 1 ? '' : 'es'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.matches.length ? p.matches.map(pretty).join(', ') : 'No keywords for this role. Consider moving it lower or replacing it.'}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-amber-500" /> Recommendations</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              {analysis.recommendations.map((r, i) => <li key={i} className="flex gap-2"><span className="text-brand-600">→</span>{r}</li>)}
            </ul>
            {orderDiffers && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-brand-50 p-3 text-sm">
                <span>Recruiters for {analysis.role.name} expect a different section order.</span>
                <Button size="sm" onClick={() => update({ sectionOrder: analysis.suggestedSectionOrder })}>Apply order</Button>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal open={Boolean(tailor)} onClose={() => setTailor(null)} title="AI-tailored bullet points" wide>
        {tailor?.focus?.length > 0 && (
          <div className="mb-4 rounded-lg bg-brand-50 p-3">
            <p className="text-xs font-semibold uppercase text-brand-700">What to emphasise for this job</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{tailor.focus.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
        {tailor?.rewrites?.length === 0 && <p className="text-sm text-slate-500">Your bullets already fit well. No rewrites suggested.</p>}
        <div className="space-y-3">
          {tailor?.rewrites?.map((rw) => (
            <div key={rw.ref} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-400">{rw.owner}</p>
              <p className="mt-1 text-sm text-slate-500 line-through decoration-slate-300">{rw.original}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{rw.improved}</p>
              {rw.why && <p className="mt-1 text-xs text-slate-500">Why: {rw.why}</p>}
              <Button size="sm" className="mt-2" variant={applied[rw.ref] ? 'secondary' : 'soft'} disabled={applied[rw.ref]} onClick={() => applyRewrite(rw)}>{applied[rw.ref] ? <><Check className="h-3.5 w-3.5" /> Applied</> : 'Apply'}</Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-400">Replace any [placeholders] with your real numbers before sending your CV.</p>
      </Modal>
    </div>
  );
}
