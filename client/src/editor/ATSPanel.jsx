import { AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Button, Card, ProgressBar, ScoreRing, Spinner } from '../components/ui.jsx';

const SEV = {
  high: { icon: AlertCircle, cls: 'text-rose-600 bg-rose-50', label: 'Fix first' },
  medium: { icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50', label: 'Should fix' },
  low: { icon: Info, cls: 'text-sky-600 bg-sky-50', label: 'Nice to fix' }
};

const PARTS = [
  { key: 'keywords', label: 'Keyword match', weight: '35%', help: 'Skills and terms the role / job description asks for.' },
  { key: 'content', label: 'Bullet quality', weight: '30%', help: 'Action verbs, numbers, length, no weak phrases.' },
  { key: 'structure', label: 'Structure', weight: '20%', help: 'Contact details, required sections, links.' },
  { key: 'formatting', label: 'Formatting', weight: '15%', help: 'Length, pronouns, dates, ATS-unfriendly characters.' }
];

export default function ATSPanel({ analysis, analyzing, runAnalysis, onJump }) {
  if (!analysis) {
    return <div className="grid place-items-center py-16">{analyzing ? <Spinner /> : <Button onClick={runAnalysis}>Run ATS check</Button>}</div>;
  }
  const groups = ['high', 'medium', 'low'].map((s) => [s, analysis.issues.filter((i) => i.severity === s)]).filter(([, l]) => l.length);

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-5 p-5">
        <ScoreRing score={analysis.score} />
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ATS score for {analysis.role.name}</p>
          <p className="text-xl font-bold text-slate-900">{analysis.grade}</p>
          <p className="mt-1 text-xs text-slate-500">
            {analysis.stats.wordCount} words · {analysis.stats.bullets || 0} bullets · {analysis.stats.quantifiedBullets || 0} with numbers · {analysis.issues.length} issue{analysis.issues.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={runAnalysis} loading={analyzing}>{!analyzing && <RefreshCw className="h-3.5 w-3.5" />} Re-check</Button>
      </Card>

      <Card className="space-y-3.5 p-4">
        {PARTS.map((p) => (
          <div key={p.key} title={p.help}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-700">{p.label} <span className="text-xs font-normal text-slate-400">({p.weight})</span></span>
              <span className="font-semibold">{analysis.breakdown[p.key]}</span>
            </div>
            <ProgressBar value={analysis.breakdown[p.key]} />
          </div>
        ))}
      </Card>

      {groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-emerald-700">No issues found. Your CV is in great shape for this role. 🎉</Card>
      ) : (
        groups.map(([sev, list]) => {
          const { icon: Icon, cls, label } = SEV[sev];
          return (
            <div key={sev}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label} ({list.length})</p>
              <div className="space-y-2">
                {list.map((i, n) => (
                  <Card key={n} className="flex gap-3 p-3">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{i.message}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{i.fix}</p>
                    </div>
                    {i.section !== 'general' && <button onClick={() => onJump(i.section)} className="self-start whitespace-nowrap text-xs font-medium text-brand-600 hover:underline">Edit</button>}
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
      <p className="px-1 text-[11px] text-slate-400">The score estimates how well applicant tracking systems and recruiters will read your CV. Different ATS products score differently, so treat it as a guide.</p>
    </div>
  );
}
