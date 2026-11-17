import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, CloudOff, Download, Eye, FileCheck2, Loader2, Palette, PenLine, Target, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { completion } from '../lib/resume.js';
import { Button, ProgressBar, Spinner, cx } from '../components/ui.jsx';
import CVPreview from '../preview/CVPreview.jsx';
import ContentPanel from '../editor/ContentPanel.jsx';
import DesignPanel from '../editor/DesignPanel.jsx';
import JobMatchPanel from '../editor/JobMatchPanel.jsx';
import ATSPanel from '../editor/ATSPanel.jsx';
import { EditorContext } from '../editor/EditorContext.jsx';
import ImportBanner from '../editor/ImportBanner.jsx';

const TABS = [
  { id: 'content', label: 'Content', icon: PenLine },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'match', label: 'Job Match', icon: Target },
  { id: 'ats', label: 'ATS Check', icon: FileCheck2 }
];
const A4_WIDTH_PX = 793.7; // 210mm at 96dpi
const A4_HEIGHT_PX = 1122.5;

function useDebouncedEffect(fn, deps, delay) {
  useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Scales the A4 page to fit the preview column and reports the page count. */
function ScaledPreview({ resume }) {
  const wrap = useRef(null);
  const page = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [height, setHeight] = useState(A4_HEIGHT_PX);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (wrap.current) setScale(Math.min(1, (wrap.current.clientWidth - 40) / A4_WIDTH_PX));
      if (page.current) setHeight(page.current.offsetHeight);
    });
    wrap.current && ro.observe(wrap.current);
    page.current && ro.observe(page.current);
    return () => ro.disconnect();
  }, []);

  const pages = Math.max(1, Math.ceil((height - 4) / A4_HEIGHT_PX));
  return (
    <div ref={wrap} className="relative mx-auto w-full">
      <div className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-500">
        A4 preview · {pages} page{pages > 1 ? 's' : ''}
        {pages > 1 && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">Students: aim for 1 page (try Compact spacing)</span>}
      </div>
      <div style={{ height: height * scale, width: A4_WIDTH_PX * scale }} className="relative mx-auto">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: A4_WIDTH_PX }} className="absolute left-0 top-0 shadow-xl ring-1 ring-slate-200">
          <CVPreview ref={page} resume={resume} />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-rose-300" style={{ top: A4_HEIGHT_PX * (i + 1) }}>
              <span className="absolute right-2 -top-5 rounded bg-rose-100 px-1.5 text-[11px] text-rose-600">page {i + 2}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [roles, setRoles] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const imported = params.get('imported') === '1';
  const [importInfo] = useState(() => location.state?.importInfo || null);
  const [showImport, setShowImport] = useState(imported);
  // Freshly imported CVs open on Job Match: tailoring to the role is the point of importing
  const [tab, setTab] = useState(imported ? 'match' : 'content');
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [focus, setFocus] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const latest = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    api.get(`/resumes/${id}`).then((d) => { setResume(d.resume); latest.current = d.resume; }).catch((e) => toast.error(e.message));
    api.get('/roles').then((d) => setRoles(d.roles)).catch(() => {});
    api.get('/ai/status').then((d) => setAiEnabled(d.enabled)).catch(() => {});
  }, [id]);

  const update = useCallback((patch) => {
    setResume((r) => {
      const next = { ...r, ...patch };
      latest.current = next;
      return next;
    });
    dirty.current = true;
    setSaveState('dirty');
  }, []);

  const save = useCallback(async () => {
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    setSaveState('saving');
    try {
      const { _id, user, createdAt, updatedAt, __v, parent, ...body } = latest.current;
      await api.put(`/resumes/${id}`, body);
      setSaveState(dirty.current ? 'dirty' : 'saved');
    } catch (e) {
      dirty.current = true;
      setSaveState('error');
      toast.error(`Not saved: ${e.message}`);
    }
  }, [id]);

  // Autosave ~1s after the last change
  useDebouncedEffect(() => { if (saveState === 'dirty') save(); }, [resume, saveState], 1000);

  // Save on leave / warn on close with unsaved changes
  useEffect(() => {
    const warn = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); save(); };
  }, [save]);

  const runAnalysis = useCallback(async () => {
    if (!latest.current) return;
    setAnalyzing(true);
    try {
      const r = latest.current;
      setAnalysis(await api.post('/ats/analyze', { resume: r, roleId: r.targetRole, jobDescription: r.jobDescription, resumeId: id }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAnalyzing(false);
    }
  }, [id]);

  // Keep the analysis fresh while the Job Match / ATS tabs are open
  const loaded = Boolean(resume);
  useEffect(() => { if (loaded && (tab === 'ats' || tab === 'match') && !analysis) runAnalysis(); }, [tab, loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  useDebouncedEffect(() => { if ((tab === 'ats' || tab === 'match') && analysis) runAnalysis(); }, [resume], 1500);

  const role = useMemo(() => roles.find((r) => r.id === resume?.targetRole) || null, [roles, resume?.targetRole]);
  const comp = useMemo(() => (resume ? completion(resume) : { percent: 0, missing: [] }), [resume]);

  const downloadPdf = async () => {
    await save();
    const prev = document.title;
    document.title = `${resume.personal?.fullName || 'CV'} - ${resume.title}`.replace(/[\\/:*?"<>|]/g, '');
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  };

  if (!resume) return <div className="grid h-screen place-items-center"><Spinner /></div>;

  return (
    <EditorContext.Provider value={{ role, roles, aiEnabled }}>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <Link to="/dashboard" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Back to dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <input value={resume.title} onChange={(e) => update({ title: e.target.value })} className="w-full max-w-sm truncate rounded border-none bg-transparent px-1 text-sm font-semibold text-slate-900 outline-none focus:bg-slate-50" aria-label="CV name" />
            <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
              <span>{role?.name || 'General'}</span>·
              <input value={resume.versionLabel} onChange={(e) => update({ versionLabel: e.target.value })} className="w-20 rounded border-none bg-transparent outline-none focus:bg-slate-50" aria-label="Version label" />
              <span className="inline-flex items-center gap-1">
                {saveState === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
                {saveState === 'saved' && <><Check className="h-3 w-3 text-emerald-500" /> Saved</>}
                {saveState === 'dirty' && <span className="text-slate-400">Unsaved changes</span>}
                {saveState === 'error' && <button onClick={save} className="inline-flex items-center gap-1 text-rose-600"><CloudOff className="h-3 w-3" /> Retry save</button>}
              </span>
            </div>
          </div>
          <div className="hidden w-40 md:block" title={comp.missing.length ? `Missing: ${comp.missing.join(', ')}` : 'Complete!'}>
            <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Completion</span><span className="font-semibold">{comp.percent}%</span></div>
            <ProgressBar value={comp.percent} />
          </div>
          {analysis && <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold lg:inline">ATS {analysis.score}</span>}
          <Button variant="secondary" className="lg:hidden" onClick={() => setShowPreview(true)}><Eye className="h-4 w-4" /></Button>
          <Button onClick={downloadPdf}><Download className="h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span></Button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left: editing panels */}
          <section className="flex w-full min-w-0 flex-col border-r border-slate-200 bg-slate-50 lg:w-[46%] xl:w-[42%]">
            <nav className="flex gap-1 border-b border-slate-200 bg-white px-3 pt-2">
              {TABS.map(({ id: t, label, icon: Icon }) => (
                <button key={t} onClick={() => setTab(t)} className={cx('flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition', tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                  <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
              {showImport && (
                <ImportBanner
                  info={importInfo}
                  roleName={role?.name || 'this role'}
                  onGo={setTab}
                  onDismiss={() => { setShowImport(false); setParams({}, { replace: true }); }}
                />
              )}
              {tab === 'content' && <ContentPanel resume={resume} update={update} focus={focus} />}
              {tab === 'design' && <DesignPanel resume={resume} update={update} />}
              {tab === 'match' && <JobMatchPanel resume={resume} update={update} analysis={analysis} analyzing={analyzing} runAnalysis={runAnalysis} />}
              {tab === 'ats' && <ATSPanel analysis={analysis} analyzing={analyzing} runAnalysis={runAnalysis} onJump={(section) => { setTab('content'); setFocus({ section: section === 'personal' ? 'personal' : section, t: Date.now() }); }} />}
            </div>
          </section>

          {/* Right: live preview */}
          <section className={cx('scroll-thin min-w-0 flex-1 overflow-y-auto bg-slate-200/70 p-6', showPreview ? 'fixed inset-0 z-40 block' : 'hidden lg:block')}>
            {showPreview && <button onClick={() => setShowPreview(false)} className="fixed right-4 top-4 z-50 rounded-full bg-white p-2 shadow lg:hidden" aria-label="Close preview"><X className="h-5 w-5" /></button>}
            <ScaledPreview resume={resume} />
          </section>
        </div>
      </div>

      {/* Unscaled copy used only for printing / PDF export */}
      {createPortal(<div className="print-root"><CVPreview id="cv-print" resume={resume} /></div>, document.body)}
    </EditorContext.Provider>
  );
}
