import { CheckCircle2, X } from 'lucide-react';
import { SECTION_TITLES } from '../lib/resume.js';

/** Shown after importing a CV: what was found + the steps to tailor it to the role. */
export default function ImportBanner({ info, roleName, onDismiss, onGo }) {
  const found = info?.found || [];
  const missing = Object.keys(SECTION_TITLES).filter((k) => !found.includes(k));
  const step = (n, text, action, label) => (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{n}</span>
      <span className="flex-1">{text}{action && <> <button onClick={action} className="font-medium text-brand-700 underline underline-offset-2">{label}</button></>}</span>
    </li>
  );

  return (
    <div className="relative mb-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 text-sm shadow-sm">
      <button onClick={onDismiss} className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600" aria-label="Dismiss"><X className="h-4 w-4" /></button>
      <p className="flex items-center gap-2 pr-6 font-semibold text-slate-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Imported {info?.fileName ? `"${info.fileName}"` : 'your CV'}{info?.method === 'ai' ? ' with AI' : ''}
      </p>
      {found.length > 0 && <p className="mt-1 text-xs text-slate-600">Found: {found.map((k) => SECTION_TITLES[k]).join(', ')}.{missing.length > 0 && <> Not found: {missing.map((k) => SECTION_TITLES[k]).join(', ')}.</>}</p>}
      {info?.warnings?.map((w, i) => <p key={i} className="mt-1 text-xs text-amber-700">{w}</p>)}
      <ol className="mt-3 space-y-1.5 text-slate-700">
        {step(1, 'Check each section: automatic reading can put a line in the wrong place.', () => onGo('content'), 'Review content')}
        {step(2, `See what your CV is missing for ${roleName} and which projects to put first.`, () => onGo('match'), 'Job Match')}
        {step(3, 'Add missing skills you really have, then use "AI: tailor my bullets".')}
        {step(4, 'Fix the issues in ATS Check, pick a template and download your PDF.', () => onGo('ats'), 'ATS Check')}
      </ol>
    </div>
  );
}
