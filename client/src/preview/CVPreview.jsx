import { forwardRef } from 'react';
import { sectionTitle } from '../lib/resume.js';

// ---------- helpers ----------
const has = (v) => (Array.isArray(v) ? v.some((x) => (typeof x === 'string' ? x.trim() : x)) : Boolean(String(v ?? '').trim()));
const dates = (a, b) => [a, b].filter(has).join(' – ');
const prettyUrl = (u = '') => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
const linkLabel = (u = '') => (/github\.com/i.test(u) ? 'GitHub' : /gitlab\.com/i.test(u) ? 'GitLab' : /figma|behance|dribbble/i.test(u) ? 'Case study' : 'Live demo');
const href = (u = '') => (/^https?:\/\//.test(u) ? u : `https://${u}`);
const SPACING = { compact: { section: '0.7em', item: '0.45em', pad: '13mm' }, normal: { section: '1em', item: '0.65em', pad: '15mm' }, relaxed: { section: '1.35em', item: '0.85em', pad: '17mm' } };

function sectionHasContent(r, key) {
  switch (key) {
    case 'summary': return has(r.summary);
    case 'education': return (r.education || []).some((e) => e.institution || e.degree);
    case 'experience': return (r.experience || []).some((e) => e.role || e.company);
    case 'projects': return (r.projects || []).some((p) => p.name);
    case 'skills': return (r.skills || []).some((g) => has(g.items));
    case 'certifications': return (r.certifications || []).some((c) => c.name);
    case 'achievements': return (r.achievements || []).some((a) => has(a.text));
    case 'activities': return (r.activities || []).some((a) => a.role || a.organization);
    default: return false;
  }
}

const visibleSections = (r) => (r.sectionOrder || []).filter((k) => !(r.hiddenSections || []).includes(k) && sectionHasContent(r, k));

function Bullets({ items }) {
  const list = (items || []).filter(has);
  if (!list.length) return null;
  return <ul>{list.map((b, i) => <li key={i}>{b}</li>)}</ul>;
}

function Row({ left, right, bold, muted = '#4b5563' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1em', alignItems: 'baseline' }}>
      <div style={{ fontWeight: bold ? 600 : 400, minWidth: 0 }}>{left}</div>
      {has(right) && <div style={{ whiteSpace: 'nowrap', fontSize: '0.92em', color: muted }}>{right}</div>}
    </div>
  );
}

// ---------- section bodies (shared by all templates) ----------
function SectionBody({ r, k, accent, gap, compactSkills, muted = '#4b5563' }) {
  const item = { marginTop: gap };
  const sub = { color: muted, fontSize: '0.95em' };
  switch (k) {
    case 'summary':
      return <p style={{ margin: 0 }}>{r.summary}</p>;
    case 'education':
      return (r.education || []).filter((e) => e.institution || e.degree).map((e, i) => (
        <div key={e.id || i} className="cv-avoid-break" style={i ? item : undefined}>
          <Row muted={muted} bold left={e.institution} right={dates(e.start, e.end)} />
          <Row muted={muted} left={<span style={sub}>{[e.degree, e.field].filter(has).join(', ')}</span>} right={[e.score, e.location].filter(has).join(' · ')} />
          {has(e.details) && <p style={{ margin: '0.15em 0 0', fontSize: '0.95em' }}><span style={{ fontWeight: 600 }}>Coursework: </span>{e.details}</p>}
        </div>
      ));
    case 'experience':
      return (r.experience || []).filter((e) => e.role || e.company).map((e, i) => (
        <div key={e.id || i} className="cv-avoid-break" style={i ? item : undefined}>
          <Row muted={muted} bold left={e.role} right={dates(e.start, e.end)} />
          <div style={{ ...sub, fontStyle: 'italic' }}>{[e.company, e.type, e.location].filter(has).join(' · ')}</div>
          <Bullets items={e.bullets} />
        </div>
      ));
    case 'projects':
      return (r.projects || []).filter((p) => p.name).map((p, i) => (
        <div key={p.id || i} className="cv-avoid-break" style={i ? item : undefined}>
          <Row
            left={
              <>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {has(p.tech) && <span style={{ fontWeight: 400, ...sub }}> | <i>{p.tech}</i></span>}
                {has(p.link) && <span style={{ fontWeight: 400 }}> | <a href={href(p.link)} style={{ color: accent, textDecoration: 'underline' }}>{linkLabel(p.link)}</a></span>}
              </>
            }
            right={dates(p.start, p.end)}
          />
          <Bullets items={p.bullets} />
        </div>
      ));
    case 'skills':
      return (r.skills || []).filter((g) => has(g.items)).map((g, i) => (
        <div key={g.id || i} style={{ marginTop: i ? (compactSkills ? '0.45em' : '0.2em') : 0 }}>
          {compactSkills ? (
            <>
              {has(g.category) && <div style={{ fontWeight: 600 }}>{g.category}</div>}
              <div>{g.items.filter(has).join(', ')}</div>
            </>
          ) : (
            <>{has(g.category) && <span style={{ fontWeight: 600 }}>{g.category}: </span>}{g.items.filter(has).join(', ')}</>
          )}
        </div>
      ));
    case 'certifications':
      return (
        <ul>
          {(r.certifications || []).filter((c) => c.name).map((c, i) => (
            <li key={c.id || i}>
              {has(c.link) ? <a href={href(c.link)} style={{ fontWeight: 600 }}>{c.name}</a> : <span style={{ fontWeight: 600 }}>{c.name}</span>}
              {has(c.issuer) && <> · {c.issuer}</>}
              {has(c.date) && <span style={{ color: muted }}> ({c.date})</span>}
            </li>
          ))}
        </ul>
      );
    case 'achievements':
      return <ul>{(r.achievements || []).filter((a) => has(a.text)).map((a, i) => <li key={a.id || i}>{a.text}</li>)}</ul>;
    case 'activities':
      return (r.activities || []).filter((a) => a.role || a.organization).map((a, i) => (
        <div key={a.id || i} className="cv-avoid-break" style={i ? item : undefined}>
          <Row muted={muted} left={<><span style={{ fontWeight: 600 }}>{a.role}</span>{has(a.organization) && <span>{has(a.role) ? ', ' : ''}{a.organization}</span>}</>} right={dates(a.start, a.end)} />
          {has(a.description) && <p style={{ margin: '0.1em 0 0' }}>{a.description}</p>}
        </div>
      ));
    default:
      return null;
  }
}

function contactItems(p = {}) {
  return [
    has(p.email) && { text: p.email, href: `mailto:${p.email}` },
    has(p.phone) && { text: p.phone, href: `tel:${p.phone.replace(/\s/g, '')}` },
    has(p.location) && { text: p.location },
    has(p.linkedin) && { text: prettyUrl(p.linkedin), href: href(p.linkedin) },
    has(p.github) && { text: prettyUrl(p.github), href: href(p.github) },
    has(p.portfolio) && { text: prettyUrl(p.portfolio), href: href(p.portfolio) }
  ].filter(Boolean);
}

// Classic header: personal details on one row, links on the next (only when there are many)
function contactRows(p) {
  const all = contactItems(p);
  if (all.length <= 4) return [all];
  const links = all.filter((c) => c.href && !c.href.startsWith('mailto:') && !c.href.startsWith('tel:'));
  return [all.filter((c) => !links.includes(c)), links];
}

const Contact = ({ c }) => (c.href ? <a href={c.href}>{c.text}</a> : <span>{c.text}</span>);

// ---------- templates ----------
function Classic({ r, s, accent }) {
  const p = r.personal || {};
  return (
    <div style={{ padding: s.pad }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2.1em', fontWeight: 700, color: '#111827', letterSpacing: '0.01em' }}>{p.fullName || 'Your Name'}</h1>
        {has(p.headline) && <div style={{ marginTop: '0.15em', fontSize: '1.08em', color: accent, fontWeight: 500 }}>{p.headline}</div>}
        {contactRows(p).map((row, ri) => (
          <div key={ri} style={{ marginTop: ri ? '0.1em' : '0.35em', fontSize: '0.93em', color: '#374151' }}>
            {row.map((c, i) => <span key={i} style={{ whiteSpace: 'nowrap' }}>{i > 0 && <span style={{ color: '#9ca3af', margin: '0 0.55em' }}>|</span>}<Contact c={c} /></span>)}
          </div>
        ))}
      </header>
      {visibleSections(r).map((k) => (
        <section key={k} style={{ marginTop: s.section }}>
          <h2 style={{ margin: '0 0 0.35em', fontSize: '1.08em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: '0.12em' }}>{sectionTitle(r, k)}</h2>
          <SectionBody r={r} k={k} accent={accent} gap={s.item} />
        </section>
      ))}
    </div>
  );
}

const SIDEBAR = ['skills', 'certifications', 'achievements'];

function Modern({ r, s, accent }) {
  const p = r.personal || {};
  const secs = visibleSections(r);
  const side = secs.filter((k) => SIDEBAR.includes(k));
  const main = secs.filter((k) => !SIDEBAR.includes(k));
  const title = (k, light) => (
    <h2 style={{ margin: '0 0 0.4em', fontSize: '1em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: light ? '#fff' : accent }}>{sectionTitle(r, k)}</h2>
  );
  return (
    <div className="cv-modern" style={{ display: 'flex', minHeight: '297mm' }}>
      <aside style={{ width: '33%', background: accent, color: '#fff', padding: `${s.pad} 7mm`, boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, fontSize: '1.75em', lineHeight: 1.15, fontWeight: 700 }}>{p.fullName || 'Your Name'}</h1>
        {has(p.headline) && <div style={{ marginTop: '0.3em', opacity: 0.9 }}>{p.headline}</div>}
        <div style={{ marginTop: s.section, fontSize: '0.9em', display: 'grid', gap: '0.3em', wordBreak: 'break-word' }}>
          {contactItems(p).map((c, i) => <Contact key={i} c={c} />)}
        </div>
        {side.map((k) => (
          <section key={k} style={{ marginTop: s.section, fontSize: '0.95em' }}>
            {title(k, true)}
            <SectionBody r={r} k={k} accent="#fff" gap={s.item} compactSkills muted="rgba(255,255,255,0.8)" />
          </section>
        ))}
      </aside>
      <main style={{ flex: 1, padding: `${s.pad} 9mm`, boxSizing: 'border-box' }}>
        {main.map((k, i) => (
          <section key={k} style={{ marginTop: i ? s.section : 0 }}>
            {title(k)}
            <SectionBody r={r} k={k} accent={accent} gap={s.item} />
          </section>
        ))}
      </main>
    </div>
  );
}

function Minimal({ r, s, accent }) {
  const p = r.personal || {};
  return (
    <div style={{ padding: s.pad }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '2em', fontWeight: 600, color: '#111827' }}>{p.fullName || 'Your Name'}</h1>
        {has(p.headline) && <div style={{ marginTop: '0.1em', color: '#4b5563', fontSize: '1.05em' }}>{p.headline}</div>}
        <div style={{ marginTop: '0.4em', fontSize: '0.92em', color: '#4b5563', display: 'flex', flexWrap: 'wrap', gap: '0.25em 1.1em' }}>
          {contactItems(p).map((c, i) => <Contact key={i} c={c} />)}
        </div>
      </header>
      {visibleSections(r).map((k) => (
        <section key={k} style={{ marginTop: s.section, display: 'grid', gridTemplateColumns: '27mm 1fr', columnGap: '5mm' }}>
          <h2 style={{ margin: 0, fontSize: '0.82em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, paddingTop: '0.2em' }}>{sectionTitle(r, k)}</h2>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.3em' }}>
            <SectionBody r={r} k={k} accent={accent} gap={s.item} />
          </div>
        </section>
      ))}
    </div>
  );
}

const TEMPLATES = { classic: Classic, modern: Modern, minimal: Minimal };

const CVPreview = forwardRef(function CVPreview({ resume, id }, ref) {
  const d = resume.design || {};
  const T = TEMPLATES[resume.template] || Classic;
  const s = SPACING[d.spacing] || SPACING.normal;
  return (
    <div id={id} ref={ref} className="cv-page" style={{ fontFamily: `"${d.font || 'Inter'}", sans-serif`, fontSize: `${d.fontSize || 10.5}pt` }}>
      <T r={resume} s={s} accent={d.accent || '#1d4ed8'} />
    </div>
  );
});

export default CVPreview;
