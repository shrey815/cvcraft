import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, CheckCircle2, FileCheck2, LayoutDashboard, ListChecks, Palette, Sparkles, Target, UploadCloud } from 'lucide-react';
import { Logo } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { icon: LayoutDashboard, title: 'Student dashboard', text: 'Keep several CV versions, see how complete each one is and its latest ATS score.' },
  { icon: ListChecks, title: 'Structured builder', text: 'Guided sections for education, projects, internships, skills, certifications and activities.' },
  { icon: Palette, title: 'Templates & live preview', text: 'Switch templates, fonts, colours and spacing and watch the CV update. Export to PDF in one click.' },
  { icon: Briefcase, title: 'Tailored to the job', text: 'Pick a target role or paste a job description to see which skills and projects to highlight.' },
  { icon: FileCheck2, title: 'ATS checker', text: 'Get a score with a breakdown of missing keywords, structure, bullet quality and formatting issues.' },
  { icon: Sparkles, title: 'AI writing assistant', text: 'Turn rough notes into strong bullet points, find action verbs and fix grammar with Gemini.' }
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50/60">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="font-medium text-slate-600 hover:text-slate-900">Log in</Link>
              <Link to="/register" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Sign up free</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-14 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700"><Sparkles className="h-3.5 w-3.5" /> Built for students & freshers</span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Build a CV that fits the job you actually want</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Upload the CV you already have, choose the job you want, and get a tailored, ATS-friendly version with clear fixes before you apply.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={user ? '/dashboard?import=1' : '/register?next=import'} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700">
            <UploadCloud className="h-5 w-5" /> Upload your CV
          </Link>
          <Link to={user ? '/dashboard' : '/register'} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">
            Build from scratch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">PDF or Word · free · your file is never stored</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [UploadCloud, 'Upload your CV', 'PDF or Word. We fill in every section for you.'],
            [Target, 'Choose the job', 'Pick a role and paste the job description.'],
            [CheckCircle2, 'Tailor & download', 'Add missing skills, improve bullets with AI, export a PDF.']
          ].map(([Icon, title, text], i) => (
            <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="absolute -top-3 left-5 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              <Icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
