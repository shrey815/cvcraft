// Helpers to turn a resume object into plain text blocks for analysis and AI prompts.

const join = (...parts) => parts.filter(Boolean).join(' ');
const arr = (v) => (Array.isArray(v) ? v : []);

export function projectText(p = {}) {
  return join(p.name, p.tech, ...arr(p.bullets));
}

export function experienceText(e = {}) {
  return join(e.role, e.company, ...arr(e.bullets));
}

export function skillsText(resume = {}) {
  return arr(resume.skills).map((g) => join(g.category, ...arr(g.items))).join(' ');
}

export function allBullets(resume = {}) {
  const bullets = [];
  arr(resume.experience).forEach((e, i) => arr(e.bullets).forEach((b, j) => b?.trim() && bullets.push({ section: 'experience', index: i, bulletIndex: j, owner: e.role || e.company || `Experience ${i + 1}`, text: b.trim() })));
  arr(resume.projects).forEach((p, i) => arr(p.bullets).forEach((b, j) => b?.trim() && bullets.push({ section: 'projects', index: i, bulletIndex: j, owner: p.name || `Project ${i + 1}`, text: b.trim() })));
  return bullets;
}

export function resumeToText(resume = {}) {
  const p = resume.personal || {};
  const lines = [
    join(p.fullName, p.headline),
    join(p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio),
    resume.summary,
    ...arr(resume.education).map((e) => join(e.degree, e.field, e.institution, e.score, e.details)),
    ...arr(resume.experience).map(experienceText),
    ...arr(resume.projects).map(projectText),
    skillsText(resume),
    ...arr(resume.certifications).map((c) => join(c.name, c.issuer)),
    ...arr(resume.achievements).map((a) => a.text),
    ...arr(resume.activities).map((a) => join(a.role, a.organization, a.description))
  ];
  return lines.filter(Boolean).join('\n');
}
