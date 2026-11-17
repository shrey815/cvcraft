import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Award, Briefcase, CheckCircle2, ChevronDown, EyeOff, FolderGit2, GraduationCap, Medal, Sparkles, Trophy, User, Users, Wrench } from 'lucide-react';
import { api } from '../lib/api.js';
import { sectionTitle } from '../lib/resume.js';
import { Button, Input, Modal, Textarea, cx } from '../components/ui.jsx';
import ListSection from './ListSection.jsx';
import AIAssist from './AIAssist.jsx';
import { useEditor } from './EditorContext.jsx';

const ICONS = { personal: User, summary: Sparkles, education: GraduationCap, experience: Briefcase, projects: FolderGit2, skills: Wrench, certifications: Award, achievements: Trophy, activities: Users };
const HINTS = {
  summary: '2-3 lines: who you are, your strongest skills, and the role you want.',
  education: 'Most recent first. Include CGPA if it is 7+ (or as your college advises).',
  experience: 'Internships, trainings, freelance or research work.',
  projects: 'Your best 2-4 projects. Link GitHub or the live demo.',
  skills: 'Group skills into categories like Languages, Frameworks, Tools.',
  certifications: 'Relevant courses and certificates (NPTEL, Coursera, AWS…).',
  achievements: 'Hackathons, coding ratings, scholarships, ranks.',
  activities: 'Clubs, volunteering, sports, events you organised.'
};

function Panel({ id, title, count, open, onToggle, hidden, done, children }) {
  const Icon = ICONS[id] || Medal;
  return (
    <div id={`panel-${id}`} className="scroll-mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className={cx('relative grid h-8 w-8 place-items-center rounded-lg', done ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600')}>
          <Icon className="h-4 w-4" />
          {done && <CheckCircle2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-emerald-500" />}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-800">{title}</span>
          {HINTS[id] && <span className="block text-xs text-slate-400">{HINTS[id]}</span>}
        </span>
        {hidden && <span className="inline-flex items-center gap-1 text-xs text-slate-400"><EyeOff className="h-3.5 w-3.5" /> hidden</span>}
        {typeof count === 'number' && count > 0 && <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600">{count}</span>}
        {done === false && !hidden && <span className="text-xs text-slate-400">Empty</span>}
        <ChevronDown className={cx('h-4 w-4 text-slate-400 transition', !open && '-rotate-90')} />
      </button>
      {open && <div className="border-t border-slate-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function SummaryEditor({ resume, update }) {
  const { role, aiEnabled } = useEditor();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);

  const generate = async () => {
    if (!aiEnabled) return toast.error('AI is not configured on the server (GEMINI_API_KEY).');
    setLoading(true);
    try {
      const { suggestions } = await api.post('/ai/summary', { resume, roleId: role?.id, jobDescription: resume.jobDescription });
      setOptions(suggestions);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  const words = (resume.summary || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <div className="relative">
        <Textarea rows={4} hint={`${words} words`} label="Summary" placeholder={`Final-year B.Tech CSE student skilled in … seeking a ${role?.name || ''} role…`} value={resume.summary || ''} onChange={(e) => update({ summary: e.target.value })} />
        <div className="absolute right-16 top-0"><AIAssist text={resume.summary} context="professional summary" modes={['improve', 'grammar']} onApply={(v) => update({ summary: v })} /></div>
      </div>
      <Button size="sm" variant="soft" className="mt-2" loading={loading} onClick={generate}><Sparkles className="h-3.5 w-3.5" /> Write it for me from my CV</Button>
      <Modal open={Boolean(options)} onClose={() => setOptions(null)} title="Summary suggestions">
        <p className="mb-3 text-xs text-slate-500">Generated only from what is in your CV{resume.jobDescription ? ' and the job description' : ''}. Edit to make it sound like you.</p>
        <div className="space-y-2">
          {options?.map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm">{s}</p>
              <Button size="sm" variant="soft" className="mt-2" onClick={() => { update({ summary: s }); setOptions(null); }}>Use this</Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function PersonalEditor({ resume, update }) {
  const p = resume.personal || {};
  const set = (k) => (e) => update({ personal: { ...p, [k]: e.target.value } });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input className="col-span-2 sm:col-span-1" label="Full name" value={p.fullName || ''} onChange={set('fullName')} />
      <Input className="col-span-2 sm:col-span-1" label="Headline" placeholder="Full Stack Developer | B.Tech CSE '26" value={p.headline || ''} onChange={set('headline')} />
      <Input className="col-span-2 sm:col-span-1" label="Email" type="email" value={p.email || ''} onChange={set('email')} />
      <Input className="col-span-2 sm:col-span-1" label="Phone" placeholder="+91 98765 43210" value={p.phone || ''} onChange={set('phone')} />
      <Input className="col-span-2 sm:col-span-1" label="Location" placeholder="Jalandhar, Punjab" value={p.location || ''} onChange={set('location')} />
      <Input className="col-span-2 sm:col-span-1" label="LinkedIn" placeholder="linkedin.com/in/yourname" value={p.linkedin || ''} onChange={set('linkedin')} />
      <Input className="col-span-2 sm:col-span-1" label="GitHub" placeholder="github.com/yourname" value={p.github || ''} onChange={set('github')} />
      <Input className="col-span-2 sm:col-span-1" label="Portfolio / website" placeholder="yourname.dev" value={p.portfolio || ''} onChange={set('portfolio')} />
    </div>
  );
}

export default function ContentPanel({ resume, update, focus }) {
  const [open, setOpen] = useState({ personal: true });

  // Opened from the ATS panel's "Edit" links
  useEffect(() => {
    if (!focus?.section) return;
    setOpen((o) => ({ ...o, [focus.section]: true }));
    setTimeout(() => document.getElementById(`panel-${focus.section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [focus]);
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const hidden = resume.hiddenSections || [];

  return (
    <div className="space-y-3">
      <Panel id="personal" title="Personal information" done={Boolean(resume.personal?.fullName && resume.personal?.email)} open={open.personal} onToggle={() => toggle('personal')}>
        <PersonalEditor resume={resume} update={update} />
      </Panel>
      {(resume.sectionOrder || []).map((k) => (
        <Panel key={k} id={k} done={k === 'summary' ? Boolean(resume.summary?.trim()) : (resume[k] || []).length > 0} title={sectionTitle(resume, k)} count={k === 'summary' ? undefined : (resume[k] || []).length} hidden={hidden.includes(k)} open={open[k]} onToggle={() => toggle(k)}>
          {k === 'summary' ? <SummaryEditor resume={resume} update={update} /> : <ListSection section={k} items={resume[k] || []} onChange={(items) => update({ [k]: items })} />}
        </Panel>
      ))}
      <p className="px-1 text-xs text-slate-400">Reorder or hide sections in the Design tab.</p>
    </div>
  );
}
