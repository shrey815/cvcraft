import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Copy, FileText, FileUp, GitBranch, LogOut, Pencil, Plus, Search, Sparkles, Target, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../lib/api.js';
import { completion } from '../lib/resume.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Button, Card, Input, Logo, Modal, ProgressBar, Select, Spinner, cx } from '../components/ui.jsx';
import RolePicker from '../components/RolePicker.jsx';
import ImportModal from './ImportModal.jsx';

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};


const scoreTone = (n) => (n >= 80 ? 'green' : n >= 60 ? 'amber' : 'red');
const OK_FILE = /\.(pdf|docx|txt)$/i;

/** The big "upload your CV" call to action. Dropping a file here opens the import dialog with it. */
function UploadHero({ onFile }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const take = (f) => {
    if (!f) return;
    if (!OK_FILE.test(f.name)) return toast.error('Upload a PDF, Word (.docx) or .txt file.');
    onFile(f);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
      className={cx('relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-6 text-white shadow-lg shadow-brand-600/20 transition sm:p-8 lg:col-span-2', drag && 'ring-4 ring-brand-300')}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"><Sparkles className="h-3 w-3" /> Recommended</span>
      <h2 className="mt-3 text-2xl font-bold sm:text-[1.7rem]">Upload your existing CV</h2>
      <p className="mt-1.5 max-w-xl text-sm text-brand-100">We'll read it, match it against the job you want, and show you exactly what to add, reorder and rewrite. Your original file stays unchanged.</p>

      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cx('relative mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition sm:flex-row sm:gap-4 sm:text-left', drag ? 'border-white bg-white/20' : 'border-white/40 bg-white/10 hover:border-white/70 hover:bg-white/15')}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow"><UploadCloud className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-semibold">{drag ? 'Drop it here' : 'Drag & drop your CV here, or click to browse'}</span>
          <span className="block text-xs text-brand-100">PDF, Word (.docx) or .txt · up to 5 MB</span>
        </span>
        <span className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow sm:inline-flex">Choose file</span>
      </button>
      <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />

      <ol className="relative mt-5 grid gap-3 text-sm sm:grid-cols-3">
        {[
          [FileUp, 'Upload', 'PDF or Word CV'],
          [Target, 'Pick your role', '+ paste the job post'],
          [CheckCircle2, 'Tailor & download', 'fix gaps, export PDF']
        ].map(([Icon, title, sub], i) => (
          <li key={title} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
            <span><span className="flex items-center gap-1 font-semibold"><Icon className="h-3.5 w-3.5" /> {title}</span><span className="block text-xs text-brand-100">{sub}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScratchCard({ onClick }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600"><Plus className="h-5 w-5" /></span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Start from scratch</h2>
      <p className="mt-1.5 text-sm text-slate-500">No CV yet? Pick your target role and fill in guided sections. They're set up in the order recruiters for that role expect.</p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
        {['Step-by-step sections', 'AI help writing bullet points', '3 ATS-friendly templates'].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}</li>)}
      </ul>
      <div className="mt-auto pt-6"><Button variant="secondary" className="w-full" onClick={onClick}>Create a new CV <ArrowRight className="h-4 w-4" /></Button></div>
    </div>
  );
}

function CVMeta({ r, roleName }) {
  const c = completion(r);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Link to={`/cv/${r._id}`} className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 hover:text-brand-700">{r.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <span>{roleName(r.targetRole)}</span>·<span>{r.versionLabel}</span>
            {r.versionLabel === 'imported' && <Badge tone="blue" className="ml-1">Uploaded</Badge>}
          </p>
        </Link>
        {typeof r.lastScore === 'number' ? <Badge tone={scoreTone(r.lastScore)}>ATS {r.lastScore}</Badge> : <Badge>Not checked</Badge>}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Completion</span><span className="font-semibold">{c.percent}%</span></div>
        <ProgressBar value={c.percent} />
        <p className="mt-2 line-clamp-1 text-xs text-slate-400">{c.missing.length ? `Missing: ${c.missing.slice(0, 3).join(', ')}${c.missing.length > 3 ? '…' : ''}` : 'All key sections filled'}</p>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState(null);
  const [roles, setRoles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState('full-stack-developer');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [dupOf, setDupOf] = useState(null);
  const [dupForm, setDupForm] = useState({ title: '', targetRole: '', versionLabel: '' });
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [params, setParams] = useSearchParams();

  // Landing page "Upload your CV" → sign up → arrives here with ?import=1
  // The flag stays in the URL until the dialog is closed, so a re-render or remount can't lose it
  const wantsImport = params.get('import') === '1';
  const closeImport = () => {
    setImporting(false);
    setImportFile(null);
    if (wantsImport) setParams({}, { replace: true });
  };

  const openImport = (file = null) => {
    setImportFile(file);
    setImporting(true);
  };

  useEffect(() => {
    api.get('/resumes').then((d) => setResumes(d.resumes)).catch((e) => { toast.error(e.message); setResumes([]); });
    api.get('/roles').then((d) => setRoles(d.roles)).catch(() => {});
  }, []);

  const roleName = (id) => roles.find((r) => r.id === id)?.name || 'General';

  // Group each CV with its versions, then filter + sort the groups
  const families = useMemo(() => {
    const list = resumes || [];
    const ids = new Set(list.map((r) => r._id));
    const groups = new Map();
    for (const r of list) {
      const root = r.parent && ids.has(r.parent) ? r.parent : r._id;
      if (!groups.has(root)) groups.set(root, { root: null, versions: [] });
      if (root === r._id) groups.get(root).root = r;
      else groups.get(root).versions.push(r);
    }
    const q = query.trim().toLowerCase();
    const matches = (r) => (!q || `${r.title} ${r.versionLabel} ${roleName(r.targetRole)}`.toLowerCase().includes(q)) && (roleFilter === 'all' || r.targetRole === roleFilter);
    const key = (r) => (sort === 'score' ? -(r.lastScore ?? -1) : sort === 'completion' ? -completion(r).percent : sort === 'name' ? r.title.toLowerCase() : -new Date(r.updatedAt));
    const cmp = (a, b) => { const x = key(a); const y = key(b); return x < y ? -1 : x > y ? 1 : 0; };
    return [...groups.values()]
      .filter((g) => g.root && [g.root, ...g.versions].some(matches))
      .map((g) => ({ ...g, versions: [...g.versions].sort(cmp) }))
      .sort((a, b) => cmp(sort === 'recent' ? [a.root, ...a.versions].sort(cmp)[0] : a.root, sort === 'recent' ? [b.root, ...b.versions].sort(cmp)[0] : b.root));
  }, [resumes, query, roleFilter, sort, roles]); // eslint-disable-line react-hooks/exhaustive-deps
  const usedRoles = useMemo(() => [...new Set((resumes || []).map((r) => r.targetRole))], [resumes]);

  const stats = useMemo(() => {
    const list = resumes || [];
    const scored = list.filter((r) => typeof r.lastScore === 'number');
    return {
      count: list.length,
      avgScore: scored.length ? Math.round(scored.reduce((s, r) => s + r.lastScore, 0) / scored.length) : null,
      best: list.length ? Math.max(...list.map((r) => completion(r).percent)) : 0
    };
  }, [resumes]);

  const create = async () => {
    setBusy(true);
    try {
      const { resume } = await api.post('/resumes', { targetRole: newRole, ...(newTitle.trim() ? { title: newTitle.trim() } : {}) });
      navigate(`/cv/${resume._id}`);
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  const openDuplicate = (r) => {
    setDupOf(r);
    setDupForm({ title: `${r.title} - `, targetRole: r.targetRole, versionLabel: '' });
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const { resume } = await api.post(`/resumes/${dupOf._id}/duplicate`, { title: dupForm.title.trim() || undefined, targetRole: dupForm.targetRole !== dupOf.targetRole ? dupForm.targetRole : undefined, versionLabel: dupForm.versionLabel.trim() || undefined });
      toast.success('New version created');
      navigate(`/cv/${resume._id}`);
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/resumes/${deleting._id}`);
      setResumes((list) => list.filter((r) => r._id !== deleting._id).map((r) => (r.parent === deleting._id ? { ...r, parent: null } : r)));
      toast.success('CV deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Log out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hi {user?.name?.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">{resumes?.length ? 'Tailor a CV for your next application, or keep improving the ones you have.' : "Let's get your CV ready for the job you want."}</p>
        </div>

        {/* 1. Start: upload is the primary action */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <UploadHero onFile={(f) => openImport(f)} />
          <ScratchCard onClick={() => setCreating(true)} />
        </section>

        {/* 2. My CVs */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My CVs</h2>
              {resumes?.length > 0 && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {resumes.length} CV{resumes.length > 1 ? 's' : ''} &amp; versions
                  {stats.avgScore !== null && <> · average ATS score <b className="text-slate-700">{stats.avgScore}</b></>}
                  {' '}· most complete <b className="text-slate-700">{stats.best}%</b>
                </p>
              )}
            </div>
            {resumes?.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search CVs" className="w-44 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                </label>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={[{ value: 'all', label: 'All roles' }, ...usedRoles.map((id) => ({ value: id, label: roleName(id) }))]} />
                <Select value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: 'recent', label: 'Recently edited' }, { value: 'score', label: 'Highest ATS score' }, { value: 'completion', label: 'Most complete' }, { value: 'name', label: 'Name A–Z' }]} />
              </div>
            )}
          </div>

          {!resumes ? (
            <div className="grid place-items-center py-20"><Spinner /></div>
          ) : resumes.length === 0 ? (
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">Your CVs will appear here</p>
              <p className="mt-1 text-xs text-slate-400">Upload your current CV above to get started in under a minute.</p>
            </div>
          ) : families.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No CVs match your search.</p>
          ) : (
            <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
              {families.map(({ root, versions }) => (
                <Card key={root._id} className="flex flex-col transition hover:shadow-md">
                  <div className="p-5">
                    <CVMeta r={root} roleName={roleName} />
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Edited {timeAgo(root.updatedAt)}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="Save a copy as a new version" onClick={() => openDuplicate(root)}><Copy className="h-4 w-4" /> <span className="hidden sm:inline">New version</span></Button>
                        <Button size="sm" variant="ghost" title="Delete" aria-label="Delete" onClick={() => setDeleting(root)}><Trash2 className="h-4 w-4" /></Button>
                        <Button size="sm" variant="soft" onClick={() => navigate(`/cv/${root._id}`)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                      </div>
                    </div>
                  </div>
                  {versions.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><GitBranch className="h-3 w-3" /> {versions.length} tailored version{versions.length > 1 ? 's' : ''}</p>
                      <ul className="divide-y divide-slate-100">
                        {versions.map((v) => (
                          <li key={v._id} className="flex items-center gap-3 py-2">
                            <Link to={`/cv/${v._id}`} className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800 hover:text-brand-700">{v.title}</p>
                              <p className="text-xs text-slate-500">{roleName(v.targetRole)} · {v.versionLabel} · {completion(v).percent}% complete · {timeAgo(v.updatedAt)}</p>
                            </Link>
                            {typeof v.lastScore === 'number' && <Badge tone={scoreTone(v.lastScore)}>ATS {v.lastScore}</Badge>}
                            <button onClick={() => setDeleting(v)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`Delete ${v.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title="New CV: what role are you targeting?" wide>
        <RolePicker roles={roles} value={newRole} onChange={setNewRole} />
        <Input className="mt-5" label="CV name (optional)" placeholder={`${roleName(newRole)} CV`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
          <Button loading={busy} onClick={create}>Create CV</Button>
        </div>
      </Modal>

      <ImportModal open={importing || wantsImport} initialFile={importFile} onClose={closeImport} roles={roles} />

      <Modal open={Boolean(dupOf)} onClose={() => setDupOf(null)} title="Save as a new version">
        <p className="mb-4 text-sm text-slate-500">Copy this CV to tailor it for a different company or role. The original stays unchanged.</p>
        <div className="space-y-4">
          <Input label="Version name" value={dupForm.title} placeholder="e.g. Frontend CV - Google" onChange={(e) => setDupForm({ ...dupForm, title: e.target.value })} />
          <Input label="Version label" hint="optional" placeholder="v2, Google, Amazon…" value={dupForm.versionLabel} onChange={(e) => setDupForm({ ...dupForm, versionLabel: e.target.value })} />
          <Select label="Target role" value={dupForm.targetRole} onChange={(e) => setDupForm({ ...dupForm, targetRole: e.target.value })} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDupOf(null)}>Cancel</Button>
          <Button loading={busy} onClick={duplicate}>Create version</Button>
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this CV?">
        <p className="text-sm text-slate-600">"{deleting?.title}" will be permanently deleted. Other versions are kept.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={remove}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
