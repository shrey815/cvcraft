// Import an existing CV: extract text from PDF/DOCX/TXT, then turn it into the app's resume structure.
// Two strategies: Gemini (best quality) and a rule-based parser (works offline, used as fallback).

import { randomUUID } from 'node:crypto';
import { aiEnabled, generateJSON } from './gemini.js';
import { ACTION_VERBS } from './atsAnalyzer.js';

export const ACCEPTED = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain']
};

export class ImportError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

export function fileKind(filename = '', mimetype = '') {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf' || ACCEPTED.pdf.includes(mimetype)) return 'pdf';
  if (ext === 'docx' || ACCEPTED.docx.includes(mimetype)) return 'docx';
  if (ext === 'txt' || mimetype === 'text/plain') return 'txt';
  if (ext === 'doc') throw new ImportError('Old .doc files are not supported. Save it as .docx or PDF and try again.', 415);
  throw new ImportError('Please upload a PDF, Word (.docx) or .txt file.', 415);
}

/** Extract plain text from an uploaded file buffer. */
export async function extractText(buffer, filename, mimetype) {
  const kind = fileKind(filename, mimetype);
  try {
    if (kind === 'pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      try {
        return (await parser.getText()).text || '';
      } finally {
        await parser.destroy().catch(() => {});
      }
    }
    if (kind === 'docx') {
      const mammoth = (await import('mammoth')).default;
      return (await mammoth.extractRawText({ buffer })).value || '';
    }
    return buffer.toString('utf8');
  } catch (e) {
    if (e instanceof ImportError) throw e;
    if (/password/i.test(e.message)) throw new ImportError('This PDF is password-protected. Remove the password and upload again.');
    throw new ImportError('Could not read this file. It may be damaged. Try exporting it again as PDF or .docx.');
  }
}

// ---------------------------------------------------------------- sanitising

const s = (v, max = 500) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : typeof v === 'number' ? String(v) : '');
const list = (v, max = 30) => (Array.isArray(v) ? v.slice(0, max) : []);
const strList = (v, max = 12, len = 400) => list(v, max).map((x) => s(x, len)).filter(Boolean);
const EXP_TYPES = ['Internship', 'Full-time', 'Part-time', 'Freelance', 'Training', 'Research'];

/** Force any parsed object (from AI or rules) into the exact resume shape, with ids. */
export function sanitizeImported(raw = {}) {
  const p = raw.personal || {};
  const id = () => randomUUID();
  const type = (t, role) => EXP_TYPES.find((x) => x.toLowerCase() === s(t).toLowerCase()) || (/intern/i.test(`${t} ${role}`) ? 'Internship' : /train|certificat/i.test(`${t} ${role}`) ? 'Training' : /freelanc/i.test(`${t} ${role}`) ? 'Freelance' : /research/i.test(`${t} ${role}`) ? 'Research' : '');

  return {
    personal: {
      fullName: s(p.fullName, 80), headline: s(p.headline, 120), email: s(p.email, 120), phone: s(p.phone, 40),
      location: s(p.location, 80), linkedin: s(p.linkedin, 200), github: s(p.github, 200), portfolio: s(p.portfolio, 200)
    },
    summary: s(raw.summary, 1500),
    education: list(raw.education, 8).map((e) => ({ id: id(), institution: s(e.institution, 150), degree: s(e.degree, 120), field: s(e.field, 120), location: s(e.location, 80), start: s(e.start, 30), end: s(e.end, 30), score: s(e.score, 40), details: s(e.details, 500) })).filter((e) => e.institution || e.degree),
    experience: list(raw.experience, 10).map((e) => ({ id: id(), role: s(e.role, 120), company: s(e.company, 120), type: type(e.type, e.role), location: s(e.location, 80), start: s(e.start, 30), end: s(e.end, 30), bullets: strList(e.bullets, 8) })).filter((e) => e.role || e.company),
    projects: list(raw.projects, 10).map((x) => ({ id: id(), name: s(x.name, 120), tech: s(x.tech, 250), link: s(x.link, 200), start: s(x.start, 30), end: s(x.end, 30), bullets: strList(x.bullets, 8) })).filter((x) => x.name),
    skills: list(raw.skills, 10).map((g) => ({ id: id(), category: s(g.category, 60), items: strList(g.items, 40, 60) })).filter((g) => g.items.length),
    certifications: list(raw.certifications, 15).map((c) => ({ id: id(), name: s(c.name, 200), issuer: s(c.issuer, 120), date: s(c.date, 30), link: s(c.link, 200) })).filter((c) => c.name),
    achievements: list(raw.achievements, 15).map((a) => ({ id: id(), text: s(typeof a === 'string' ? a : a?.text, 400) })).filter((a) => a.text),
    activities: list(raw.activities, 10).map((a) => ({ id: id(), role: s(a.role, 120), organization: s(a.organization, 150), start: s(a.start, 30), end: s(a.end, 30), description: s(a.description, 500) })).filter((a) => a.role || a.organization)
  };
}

// ---------------------------------------------------------------- AI parser

export async function aiParseResume(text) {
  const prompt = `Extract the CV below into JSON. Copy the student's wording exactly: do NOT rewrite, improve, summarise or invent anything.
If something is not in the CV, use an empty string or empty array.
- bullets: one array item per bullet point / sentence of description (merge lines that were wrapped).
- skills: group as in the CV (e.g. "Languages", "Frameworks"); if ungrouped use one group with category "Skills".
- Dates as written (e.g. "Aug 2022", "2026", "Present").
- Internships, trainings and jobs go in experience (type: Internship | Full-time | Part-time | Freelance | Training | Research).
- Clubs, volunteering, positions of responsibility go in activities. Awards, ranks, coding ratings go in achievements.
JSON shape:
{"personal":{"fullName":"","headline":"","email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},
"summary":"",
"education":[{"institution":"","degree":"","field":"","location":"","start":"","end":"","score":"","details":""}],
"experience":[{"role":"","company":"","type":"","location":"","start":"","end":"","bullets":[""]}],
"projects":[{"name":"","tech":"","link":"","start":"","end":"","bullets":[""]}],
"skills":[{"category":"","items":[""]}],
"certifications":[{"name":"","issuer":"","date":"","link":""}],
"achievements":[""],
"activities":[{"role":"","organization":"","start":"","end":"","description":""}]}

CV text:
"""${text.slice(0, 15000)}"""`;
  return generateJSON(prompt, { temperature: 0.1, timeoutMs: 45000 });
}

// ---------------------------------------------------------------- rule-based parser

const norm = (l) => l.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const HEADINGS = {
  summary: ['summary', 'professional summary', 'profile', 'profile summary', 'professional profile', 'objective', 'career objective', 'about me', 'about'],
  education: ['education', 'academic background', 'academics', 'academic details', 'educational qualification', 'educational qualifications', 'academic qualifications', 'qualifications', 'education details'],
  experience: ['experience', 'work experience', 'professional experience', 'internships', 'internship', 'internship experience', 'internships and training', 'employment', 'work history', 'experience and internships', 'training', 'trainings', 'industrial training', 'summer training', 'relevant experience'],
  projects: ['projects', 'academic projects', 'personal projects', 'key projects', 'major projects', 'project work', 'project', 'technical projects'],
  skills: ['skills', 'technical skills', 'key skills', 'core competencies', 'technologies', 'tech stack', 'skills and tools', 'skill set', 'skillset', 'technical proficiency', 'skills and interests'],
  certifications: ['certifications', 'certificates', 'certification', 'courses', 'licenses and certifications', 'certifications and courses', 'courses and certifications', 'online courses'],
  achievements: ['achievements', 'awards', 'honors', 'honours', 'accomplishments', 'awards and achievements', 'achievements and awards', 'honors and awards', 'awards and recognition'],
  activities: ['extracurricular activities', 'extra curricular activities', 'extracurricular', 'extra curricular', 'activities', 'positions of responsibility', 'position of responsibility', 'leadership', 'leadership and activities', 'volunteering', 'volunteer experience', 'co curricular activities', 'extra curricular and leadership'],
  ignore: ['hobbies', 'interests', 'hobbies and interests', 'languages', 'languages known', 'personal details', 'personal information', 'declaration', 'references', 'strengths']
};
const HEADING_LOOKUP = new Map(Object.entries(HEADINGS).flatMap(([k, v]) => v.map((h) => [h, k])));

function headingOf(line) {
  if (line.length > 45) return null;
  return HEADING_LOOKUP.get(norm(line)) || null;
}

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MONTH}\\s*'?\\d{2,4}|\\d{1,2}[/.-]\\d{2,4}|(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|now|ongoing|till date)`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:[-–—~]|to|\\s)\\s*(${END})|(${DATE})`, 'i');
const BULLET_RE = /^\s*(?:[•●▪◦‣■□►➢✓✔*·]|[-–—](?=\s)|\d{1,2}[.)](?=\s))\s*/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?){1,2}\d{3,5}/;
// A URL must have http(s)/www, or a path, or a common site TLD, so "Node.js" / "B.Tech" / "Socket.io" aren't links
const URL_SRC = '(?:https?:\\/\\/\\S+|www\\.[^\\s|,;]+|[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|in|org|net|dev|app|me|co|site|xyz|page|ai)(?:\\/[^\\s|,;]*)?\\b|[a-z0-9-]+(?:\\.[a-z0-9-]+)+\\/[^\\s|,;]+)';
const URL_RE = new RegExp(URL_SRC, 'gi');
const isUrl = (t) => new RegExp(URL_SRC, 'i').test(t);
const SCORE_RE = /(?:(?:cgpa|gpa|sgpa|percentage|score|marks)\s*[:\-–]?\s*\d{1,2}(?:\.\d{1,2})?(?:\s*\/\s*10)?\s*%?)|(?:\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*10\s*)?(?:cgpa|gpa|sgpa))|(?:\d{2}(?:\.\d{1,2})?\s*%)/i;
const DEGREE_RE = /(b\.?\s?tech|b\.?\s?e\b|bachelor|master|m\.?\s?tech|mca|bca|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|bba|mba|diploma|ph\.?d|class\s*(?:x|xii|10|12)|\b(?:xii|x)th\b|1[02]th|senior secondary|higher secondary|secondary|intermediate|matriculation|hsc|ssc|cbse|icse)/i;
const INSTITUTE_RE = /(university|college|institute|school|academy|vidyalaya|iit|nit|iiit|bits|polytechnic)/i;

function takeDates(text) {
  const m = text.match(RANGE_RE);
  if (!m) return { start: '', end: '', rest: text };
  const start = (m[1] || m[3] || '').trim();
  const end = (m[2] || '').trim();
  const rest = text.replace(m[0], ' ').replace(/[|,–—-]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return { start, end: /^(current|now|ongoing|till date)$/i.test(end) ? 'Present' : end.replace(/^present$/i, 'Present'), rest };
}

const splitParts = (t) => t.split(/\s+[|•·]\s+|\t+|\s+[–—]\s+|\s+-\s+|\s+at\s+|,\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);

// "Built …", "Implemented …", "Created …": a line starting like this begins a new bullet, not a wrapped one
function startsWithVerb(line) {
  const w = (line.match(/^[A-Z][a-z]+/) || [''])[0].toLowerCase();
  return ACTION_VERBS.has(w) || (w.length > 4 && w.endsWith('ed'));
}

/** Group a section's lines into entries {header: [], bullets: []}, rebuilding wrapped lines. */
function toEntries(lines, wrapLen) {
  const entries = [];
  let cur = null;
  let prevRaw = '';
  const newEntry = (header) => {
    cur = { header: [header], bullets: [] };
    entries.push(cur);
  };
  for (const raw of lines) {
    const hasBullet = BULLET_RE.test(raw);
    const line = raw.replace(BULLET_RE, '').trim();
    if (!line) continue;
    const looksHeader = !hasBullet && (RANGE_RE.test(line) || /\t/.test(raw) || / \| /.test(line)) && !/[.!?]$/.test(line) && line.length < wrapLen * 1.3;
    const wrapped = cur?.bullets.length && !hasBullet && !looksHeader && (/^[a-z(&]/.test(line) || (prevRaw.length >= wrapLen * 0.8 && !/[.!?:]$/.test(prevRaw) && !startsWithVerb(line)));

    if (hasBullet) {
      if (!cur) newEntry('');
      cur.bullets.push(line);
    } else if (wrapped) {
      cur.bullets[cur.bullets.length - 1] += ` ${line}`;
    } else if (looksHeader) {
      if (!cur || cur.bullets.length || cur.header.some((h) => RANGE_RE.test(h))) newEntry(line);
      else cur.header.push(line);
    } else if (!cur) {
      newEntry(line);
    } else if (!cur.bullets.length && cur.header.length < 3 && line.length < wrapLen * 0.7 && !/[.!?]$/.test(line)) {
      cur.header.push(line);
    } else {
      cur.bullets.push(line);
    }
    prevRaw = raw.trim();
  }
  return entries;
}

/** Education entries start at an institution line (or a new degree once the current entry has both). */
function groupEducation(lines) {
  const entries = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(BULLET_RE, '').trim();
    if (!line) continue;
    const isInst = INSTITUTE_RE.test(line);
    const isDeg = DEGREE_RE.test(line);
    const full = cur && cur.inst && cur.deg;
    if (!cur || (isInst && cur.inst) || (isDeg && !isInst && full)) {
      cur = { header: [], bullets: [], inst: false, deg: false };
      entries.push(cur);
    }
    cur.header.push(line);
    cur.inst ||= isInst;
    cur.deg ||= isDeg;
  }
  return entries;
}

function parseEducation(entries) {
  return entries.map(({ header, bullets }) => {
    const all = [...header, ...bullets];
    const { start, end } = takeDates(all.join(' | '));
    const strip = (t) => takeDates(t).rest.replace(SCORE_RE, '').replace(/\s*[|,–-]\s*$/, '').trim();
    const instLine = all.find((l) => INSTITUTE_RE.test(l)) || header[0] || '';
    const degLine = all.find((l) => DEGREE_RE.test(l) && l !== instLine) || (DEGREE_RE.test(instLine) ? instLine : '');
    const score = (all.join(' ').match(SCORE_RE) || [''])[0];
    let institution = strip(instLine);
    let degree = strip(degLine);
    if (institution === degree) {
      const parts = splitParts(institution);
      institution = parts.find((p) => INSTITUTE_RE.test(p)) || parts[0] || '';
      degree = parts.find((p) => DEGREE_RE.test(p)) || '';
    }
    let field = '';
    const m = degree.match(/^(.*?)\s*(?:\bin\b|,|\()\s*(.+?)\)?$/);
    if (m && DEGREE_RE.test(m[1])) [, degree, field] = m;
    const details = all.filter((l) => l !== instLine && l !== degLine).map(strip).filter(Boolean).join('; ');
    return { institution, degree, field, start, end, score, details };
  });
}

function parseExperience(entries) {
  return entries.map(({ header, bullets }) => {
    const { start, end, rest } = takeDates(header.join(' | '));
    const parts = splitParts(rest.replace(/\s*\|\s*$/, ''));
    const [role = '', company = ''] = /intern|developer|engineer|analyst|trainee|assistant|lead|designer|manager|associate|member|volunteer/i.test(parts[1] || '') && !/intern|developer|engineer|analyst|trainee|designer/i.test(parts[0] || '') ? [parts[1], parts[0]] : parts;
    const location = parts.slice(2).find((p) => /remote|onsite|hybrid|india|,/i.test(p)) || '';
    return { role, company, location, start, end, type: '', bullets };
  });
}

function parseProjects(entries) {
  return entries.map(({ header, bullets }) => {
    const joined = header.join(' | ');
    const { start, end, rest } = takeDates(joined);
    const link = ((rest.match(URL_RE) || []).find((u) => /\/|^www\.|^http/i.test(u)) || '').replace(/[).]+$/, '');
    const parts = rest.replace(link, '').split(/\s*[|]\s*|\t+|\s+[–—]\s+|\s+-\s+/).map((p) => p.trim()).filter((p) => p && !/^(github|live|demo|link|live demo|code)$/i.test(p));
    let name = (parts[0] || '').replace(/[:,]$/, '');
    let tech = parts.slice(1).find((p) => p.includes(',') || /react|node|python|java|sql|mongo|django|flask|html|css|ml|tensorflow|android|kotlin|flutter|firebase|aws/i.test(p)) || '';
    // "Tech Stack: React, Node.js" as its own bullet or glued to the end of a bullet
    const TECH_RE = /(?:^|\s)(?:tech(?:nologies|nology)?(?:\s+stack|\s+used)?|tools(?:\s+used)?|built\s+with|stack)\s*[:\-–]\s*(.+)$/i;
    const kept = [];
    for (const b of bullets) {
      const m = b.match(TECH_RE);
      if (m) {
        tech = tech || m[1].replace(/\.$/, '').trim();
        const before = b.slice(0, m.index).trim();
        if (before) kept.push(before);
      } else kept.push(b);
    }
    const paren = name.match(/^(.*?)\s*\((.+)\)$/);
    if (paren && !tech) [, name, tech] = paren;
    return { name, tech, link, start, end, bullets: kept };
  });
}

function parseSkills(lines) {
  const groups = [];
  const loose = [];
  const splitItems = (t) => t.split(/\s*[,;|•·]\s*|\s{2,}/).map((x) => x.replace(/\.$/, '').trim()).filter((x) => x && x.length < 50);
  for (const raw of lines) {
    const line = raw.replace(BULLET_RE, '').trim();
    const m = line.match(/^([A-Za-z][A-Za-z /&+.-]{1,35}?)\s*[:–-]\s+(.+)$/);
    if (m) groups.push({ category: m[1].trim(), items: splitItems(m[2]) });
    else if (groups.length && /^[a-z]/.test(line)) groups[groups.length - 1].items.push(...splitItems(line));
    else loose.push(...splitItems(line));
  }
  if (loose.length) groups.push({ category: groups.length ? 'Other' : 'Skills', items: loose });
  return groups;
}

function simpleItems(lines, wrapLen) {
  return toEntries(lines, wrapLen).flatMap((e) => [...e.header.filter(Boolean).map((h, i) => (i === 0 && !e.bullets.length ? h : h)), ...e.bullets]).filter(Boolean);
}

function parseCertifications(lines, wrapLen) {
  return simpleItems(lines, wrapLen).map((t) => {
    const { start, rest } = takeDates(t);
    const [name, ...more] = rest.split(/\s+[|·–—-]\s+|\s+by\s+|,\s+(?=[A-Z])/);
    return { name: (name || '').trim(), issuer: more.join(', ').replace(/[()]/g, '').trim(), date: start };
  });
}

function parseActivities(entries) {
  return entries.map(({ header, bullets }) => {
    const { start, end, rest } = takeDates(header.join(' | '));
    const parts = splitParts(rest);
    return { role: parts[0] || '', organization: parts.slice(1).join(', '), start, end, description: bullets.join(' ') };
  });
}

/** Rule-based parser. Returns a raw object for sanitizeImported(). */
export function parseResumeText(text = '') {
  const lines = text.replace(/\r/g, '').replace(/[\uE000-\uF8FF\uFFFD]/g, ' ').split('\n').map((l) => l.replace(/[\u00a0\u2000-\u200b]/g, ' ').replace(/[ ]{2,}/g, (m) => (m.length >= 3 ? '\t' : ' ')).trimEnd()).filter((l) => l.trim() && !/^--\s*\d+\s*of\s*\d+\s*--$/.test(l.trim()));
  const lengths = lines.map((l) => l.trim().length).sort((a, b) => a - b);
  const wrapLen = lengths[Math.floor(lengths.length * 0.9)] || 90;

  const sections = { top: [] };
  let current = 'top';
  for (const l of lines) {
    const h = headingOf(l.trim());
    if (h) {
      current = h;
      sections[h] = sections[h] || [];
    } else (sections[current] = sections[current] || []).push(l);
  }

  // Header block: name, headline, contact details
  const top = sections.top;
  const joinedTop = top.join(' | ');
  const urls = (joinedTop.replace(new RegExp(EMAIL_RE.source, 'g'), ' ').match(URL_RE) || []).filter((u) => !/@/.test(u));
  const email = (joinedTop.match(EMAIL_RE) || [''])[0];
  const phoneMatch = top.map((l) => l.replace(EMAIL_RE, '').replace(URL_RE, '')).join(' | ').match(PHONE_RE);
  const phone = phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10 ? phoneMatch[0].trim() : '';
  const contactish = (l) => EMAIL_RE.test(l) || isUrl(l) || (phone && l.includes(phone));
  const plain = top.filter((l) => !contactish(l.trim()));
  const name = (plain.find((l) => /^[A-Za-z .'-]{3,50}$/.test(l.trim()) && l.trim().split(/\s+/).length <= 5) || '').trim();
  const headline = (plain.find((l) => l.trim() !== name && l.trim().length < 110 && !/[.!?]$/.test(l.trim())) || '').trim();
  const contactLine = top.find((l) => EMAIL_RE.test(l) || (phone && l.includes(phone))) || '';
  const location = contactLine.split(/\s*[|•·]\s*|\t/).map((x) => x.trim()).find((x) => x && !EMAIL_RE.test(x) && !/\d{5,}/.test(x.replace(/\s/g, '')) && !isUrl(x) && /^[A-Za-z ,.-]{3,40}$/.test(x)) || '';
  const leftover = plain.filter((l) => l.trim() !== name && l.trim() !== headline);

  const result = {
    personal: {
      fullName: name === name.toUpperCase() ? name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : name,
      headline,
      email,
      phone,
      location,
      linkedin: urls.find((u) => /linkedin\.com/i.test(u)) || '',
      github: urls.find((u) => /github\.com/i.test(u)) || '',
      portfolio: urls.find((u) => !/linkedin\.com|github\.com/i.test(u)) || ''
    },
    summary: (sections.summary || (leftover.join(' ').split(/\s+/).length > 25 ? leftover : [])).map((l) => l.trim()).join(' '),
    education: parseEducation(groupEducation(sections.education || [])),
    experience: parseExperience(toEntries(sections.experience || [], wrapLen)),
    projects: parseProjects(toEntries(sections.projects || [], wrapLen)),
    skills: parseSkills(sections.skills || []),
    certifications: parseCertifications(sections.certifications || [], wrapLen),
    achievements: simpleItems(sections.achievements || [], wrapLen),
    activities: parseActivities(toEntries(sections.activities || [], wrapLen))
  };
  return result;
}

/**
 * Full pipeline: AI when available (falls back to rules on any AI error).
 * Returns { data, method, warnings }.
 */
export async function importResume(text, { useAI = true } = {}) {
  const clean = text.replace(/\u0000/g, '').trim();
  if (clean.replace(/\s/g, '').length < 80) {
    throw new ImportError("We couldn't find text in this file. If it's a scanned or image-only PDF, export your CV from Word/Google Docs as PDF and try again.");
  }
  const warnings = [];
  if (useAI && aiEnabled()) {
    try {
      return { data: sanitizeImported(await aiParseResume(clean)), method: 'ai', warnings };
    } catch (e) {
      warnings.push(`AI reader unavailable (${e.message}). Used the basic reader instead, so check each section carefully.`);
    }
  }
  const data = sanitizeImported(parseResumeText(clean));
  return { data, method: 'rules', warnings };
}
