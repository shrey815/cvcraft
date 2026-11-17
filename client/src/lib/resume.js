// Section definitions, empty-item factories and completion tracking.

export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const SECTION_TITLES = {
  summary: 'Professional Summary',
  education: 'Education',
  experience: 'Experience & Internships',
  projects: 'Projects',
  skills: 'Technical Skills',
  certifications: 'Certifications',
  achievements: 'Achievements',
  activities: 'Extracurricular Activities'
};

export const ALL_SECTIONS = Object.keys(SECTION_TITLES);

export const sectionTitle = (resume, key) => resume?.sectionTitles?.[key] || SECTION_TITLES[key];

// Field layout for the generic list editor. type: text | textarea | bullets | tags | select
export const ITEM_FIELDS = {
  education: [
    { key: 'institution', label: 'College / School', placeholder: 'Lovely Professional University', full: true },
    { key: 'degree', label: 'Degree', placeholder: 'B.Tech' },
    { key: 'field', label: 'Field of study', placeholder: 'Computer Science & Engineering' },
    { key: 'start', label: 'Start', placeholder: 'Aug 2022' },
    { key: 'end', label: 'End', placeholder: 'May 2026 (Expected)' },
    { key: 'score', label: 'CGPA / Percentage', placeholder: '8.4 CGPA' },
    { key: 'location', label: 'Location', placeholder: 'Phagwara, Punjab' },
    { key: 'details', label: 'Relevant coursework / details', type: 'textarea', placeholder: 'DSA, DBMS, Operating Systems, Computer Networks', full: true }
  ],
  experience: [
    { key: 'role', label: 'Role', placeholder: 'Web Development Intern' },
    { key: 'company', label: 'Company / Organisation', placeholder: 'Acme Technologies' },
    { key: 'type', label: 'Type', type: 'select', default: 'Internship', options: [{ value: '', label: '—' }, 'Internship', 'Full-time', 'Part-time', 'Freelance', 'Training', 'Research'] },    { key: 'location', label: 'Location', placeholder: 'Remote' },
    { key: 'start', label: 'Start', placeholder: 'Jun 2025' },
    { key: 'end', label: 'End', placeholder: 'Aug 2025' },
    { key: 'bullets', label: 'What you did (bullet points)', type: 'bullets', full: true }
  ],
  projects: [
    { key: 'name', label: 'Project name', placeholder: 'EventFlow' },
    { key: 'link', label: 'GitHub / Live link', placeholder: 'github.com/you/eventflow' },
    { key: 'tech', label: 'Tech stack', placeholder: 'React, Node.js, Express, MongoDB, Stripe', full: true },
    { key: 'start', label: 'Start', placeholder: 'Jan 2025' },
    { key: 'end', label: 'End', placeholder: 'Mar 2025' },
    { key: 'bullets', label: 'Description (bullet points)', type: 'bullets', full: true }
  ],
  skills: [
    { key: 'category', label: 'Category', placeholder: 'Languages / Frameworks / Tools', full: true },
    { key: 'items', label: 'Skills (press Enter or comma to add)', type: 'tags', full: true }
  ],
  certifications: [
    { key: 'name', label: 'Certification', placeholder: 'AWS Cloud Practitioner', full: true },
    { key: 'issuer', label: 'Issued by', placeholder: 'Amazon Web Services' },
    { key: 'date', label: 'Date', placeholder: 'Jul 2025' },
    { key: 'link', label: 'Credential link', placeholder: 'credly.com/...', full: true }
  ],
  achievements: [{ key: 'text', label: 'Achievement', type: 'textarea', placeholder: 'Solved 400+ problems on LeetCode (max rating 1750)', full: true }],
  activities: [
    { key: 'role', label: 'Role', placeholder: 'Technical Lead' },
    { key: 'organization', label: 'Club / Organisation', placeholder: 'Coding Club, LPU' },
    { key: 'start', label: 'Start', placeholder: '2024' },
    { key: 'end', label: 'End', placeholder: 'Present' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Organised 3 hackathons with 300+ participants', full: true }
  ]
};

export function emptyItem(section) {
  const item = { id: uid() };
  for (const f of ITEM_FIELDS[section]) item[f.key] = f.type === 'bullets' ? [''] : f.type === 'tags' ? [] : f.type === 'select' ? (f.default ?? '') : '';  return item;
}

export function itemLabel(section, item, i) {
  const label = {
    education: item.institution || item.degree,
    experience: [item.role, item.company].filter(Boolean).join(' · '),
    projects: item.name,
    skills: item.category,
    certifications: item.name,
    achievements: item.text?.slice(0, 60),
    activities: [item.role, item.organization].filter(Boolean).join(' · ')
  }[section];
  return label || `New ${section === 'activities' ? 'activity' : section.replace(/s$/, '')} ${i + 1}`;
}

const filled = (v) => (Array.isArray(v) ? v.some((x) => (typeof x === 'string' ? x.trim() : x)) : Boolean(String(v ?? '').trim()));

/** Completion % and what is missing. Used on the dashboard and the editor header. */
export function completion(r = {}) {
  const p = r.personal || {};
  const projects = (r.projects || []).filter((x) => x.name);
  const experience = (r.experience || []).filter((x) => x.role || x.company);
  const skillCount = (r.skills || []).reduce((n, g) => n + (g.items || []).filter(Boolean).length, 0);
  const checks = [
    { label: 'Name', weight: 5, ok: filled(p.fullName) },
    { label: 'Email & phone', weight: 8, ok: filled(p.email) && filled(p.phone) },
    { label: 'LinkedIn / GitHub', weight: 7, ok: filled(p.linkedin) || filled(p.github) || filled(p.portfolio) },
    { label: 'Summary', weight: 10, ok: (r.summary || '').trim().split(/\s+/).length >= 15 },
    { label: 'Education', weight: 15, ok: (r.education || []).some((e) => e.institution && e.degree) },
    { label: '8+ skills', weight: 15, ok: skillCount >= 8 },
    { label: '2+ projects with bullets', weight: 20, ok: projects.filter((x) => filled(x.bullets)).length >= 2 },
    { label: 'Experience or 3rd project', weight: 10, ok: experience.length > 0 || projects.length >= 3 },
    { label: 'Certifications', weight: 5, ok: (r.certifications || []).some((c) => c.name) },
    { label: 'Achievements / activities', weight: 5, ok: (r.achievements || []).some((a) => a.text) || (r.activities || []).some((a) => a.role || a.organization) }
  ];
  const percent = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  return { percent, missing: checks.filter((c) => !c.ok).map((c) => c.label) };
}

export const FONTS = ['Inter', 'Roboto', 'Lato', 'Source Sans 3', 'Merriweather', 'Lora', 'EB Garamond'];
export const ACCENTS = ['#1d4ed8', '#0f766e', '#7c3aed', '#b91c1c', '#c2410c', '#0f172a', '#be185d', '#15803d'];
export const TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Single column, centred header. Safest for ATS.' },
  { id: 'modern', name: 'Modern', desc: 'Two columns with a coloured sidebar.' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean, left-aligned, lots of white space.' }
];
