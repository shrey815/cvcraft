// ATS checker + job-profile matcher. Pure functions (no DB, no network) so it is easy to test.

import { getRoleProfile } from '../data/roleProfiles.js';
import { extractKeywords, extractRequirements, mentions, normalize } from './keywords.js';
import { allBullets, experienceText, projectText, resumeToText, skillsText } from './resumeText.js';

export const ACTION_VERBS = new Set([
  'achieved', 'accelerated', 'analyzed', 'architected', 'assessed', 'audited', 'automated', 'built', 'collaborated', 'conducted',
  'configured', 'containerized', 'coordinated', 'created', 'debugged', 'delivered', 'deployed', 'designed', 'detected', 'developed',
  'devised', 'directed', 'drove', 'engineered', 'enhanced', 'established', 'evaluated', 'executed', 'expanded', 'forecasted',
  'founded', 'generated', 'hardened', 'identified', 'implemented', 'improved', 'increased', 'initiated', 'integrated', 'introduced',
  'investigated', 'launched', 'led', 'maintained', 'managed', 'mentored', 'migrated', 'mitigated', 'modeled', 'monitored',
  'optimized', 'orchestrated', 'organized', 'owned', 'pioneered', 'predicted', 'presented', 'prototyped', 'provisioned', 'published',
  'raised', 'redesigned', 'reduced', 'refactored', 'reported', 'researched', 'resolved', 'revamped', 'scaled', 'secured',
  'shipped', 'simplified', 'solved', 'spearheaded', 'streamlined', 'strengthened', 'tested', 'trained', 'transformed', 'upgraded',
  'visualized', 'won', 'wrote', 'cleaned', 'coded', 'authored', 'boosted', 'cut', 'enabled', 'facilitated', 'formulated'
]);

const WEAK_PHRASES = ['responsible for', 'worked on', 'helped with', 'helped in', 'was involved in', 'involved in', 'duties included', 'tasked with', 'participated in', 'did ', 'various', 'etc'];
const PRONOUNS = /\b(i|me|my|mine|myself)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const SOFTWARE_CATEGORIES = new Set(['Software', 'Data', 'Infrastructure']);

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const arr = (v) => (Array.isArray(v) ? v : []);
const words = (s = '') => s.trim().split(/\s+/).filter(Boolean);

function issue(category, severity, section, message, fix) {
  return { category, severity, section, message, fix };
}

/** Build the list of keywords the CV is measured against. */
export function buildTargets(role, jobDescription) {
  const jdKeywords = extractKeywords(jobDescription);
  if (jdKeywords.length >= 3) {
    return { source: 'job-description', keywords: jdKeywords.slice(0, 30).map((k) => ({ keyword: k.keyword, weight: k.count >= 2 ? 2 : 1, inRole: role.coreSkills.includes(k.keyword) })) };
  }
  return {
    source: 'role-profile',
    keywords: [
      ...role.coreSkills.map((k) => ({ keyword: k, weight: 2, inRole: true })),
      ...role.niceToHave.map((k) => ({ keyword: k, weight: 1, inRole: true }))
    ]
  };
}

function analyzeKeywords(resume, targets) {
  const full = normalize(resumeToText(resume));
  const skills = normalize(skillsText(resume));
  const matched = [];
  const missing = [];
  const notInSkills = [];
  let got = 0;
  let total = 0;

  for (const t of targets.keywords) {
    total += t.weight;
    if (mentions(full, t.keyword)) {
      got += t.weight;
      matched.push(t.keyword);
      if (!mentions(skills, t.keyword)) notInSkills.push(t.keyword);
    } else {
      missing.push({ keyword: t.keyword, important: t.weight > 1 });
    }
  }
  return { score: total ? clamp((got / total) * 100) : 100, matched, missing, notInSkills };
}

function rankItems(items, textFn, targets, labelFn) {
  return arr(items)
    .map((item, index) => {
      const text = normalize(textFn(item));
      const hits = targets.keywords.filter((t) => mentions(text, t.keyword)).map((t) => t.keyword);
      return { index, name: labelFn(item, index), matches: hits, relevance: hits.length };
    })
    .sort((a, b) => b.relevance - a.relevance);
}

function analyzeStructure(resume, role) {
  const p = resume.personal || {};
  const issues = [];
  let score = 100;
  const need = (cond, pts, sev, section, msg, fix) => {
    if (!cond) {
      score -= pts;
      issues.push(issue('structure', sev, section, msg, fix));
    }
  };

  need(p.fullName?.trim(), 20, 'high', 'personal', 'Your name is missing.', 'Add your full name at the top.');
  need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || ''), 15, 'high', 'personal', 'A valid email address is missing.', 'Use a professional email (firstname.lastname@...).');
  need((p.phone || '').replace(/\D/g, '').length >= 10, 10, 'high', 'personal', 'Phone number is missing or incomplete.', 'Add a phone number with country code.');
  need(p.linkedin?.trim(), 5, 'medium', 'personal', 'No LinkedIn profile linked.', 'Add your LinkedIn URL; recruiters check it.');
  if (SOFTWARE_CATEGORIES.has(role.category)) {
    need(p.github?.trim() || p.portfolio?.trim(), 5, 'medium', 'personal', 'No GitHub or portfolio link.', 'For tech roles, link GitHub so recruiters can see your code.');
  }
  if (role.id === 'ui-ux-designer') need(p.portfolio?.trim(), 10, 'high', 'personal', 'Designers need a portfolio link.', 'Add a Behance/Dribbble/personal site link.');

  const summaryWords = words(resume.summary || '').length;
  need(summaryWords > 0, 10, 'medium', 'summary', 'No professional summary.', 'Write 2-3 lines on who you are, your key skills and the role you want.');
  if (summaryWords > 80) issues.push(issue('structure', 'low', 'summary', `Summary is long (${summaryWords} words).`, 'Keep it under 60-70 words.'));

  need(arr(resume.education).some((e) => e.institution || e.degree), 20, 'high', 'education', 'Education section is empty.', 'Add your degree, college, years and CGPA.');
  const skillCount = arr(resume.skills).reduce((n, g) => n + arr(g.items).filter(Boolean).length, 0);
  need(skillCount > 0, 20, 'high', 'skills', 'Skills section is empty.', 'List technical skills grouped by category.');
  if (skillCount > 0 && skillCount < 6) issues.push(issue('structure', 'medium', 'skills', `Only ${skillCount} skills listed.`, 'Aim for 8-15 relevant skills grouped into categories.'));
  if (skillCount > 30) issues.push(issue('structure', 'low', 'skills', `${skillCount} skills listed, which reads like keyword stuffing.`, 'Keep the 15-20 most relevant to the role.'));

  const projects = arr(resume.projects).filter((x) => x.name);
  const experience = arr(resume.experience).filter((x) => x.role || x.company);
  need(projects.length + experience.length > 0, 25, 'high', 'projects', 'No projects or experience added.', 'Add at least 2 projects or internships with bullet points.');
  if (projects.length === 1 && experience.length === 0) issues.push(issue('structure', 'medium', 'projects', 'Only one project listed.', 'Students should show 2-4 strong projects.'));

  projects.forEach((pr) => {
    if (!pr.tech?.trim()) issues.push(issue('structure', 'low', 'projects', `"${pr.name}" does not list its tech stack.`, 'Add the technologies used (e.g. React, Node.js, MongoDB).'));
    if (!pr.link?.trim() && SOFTWARE_CATEGORIES.has(role.category)) issues.push(issue('structure', 'low', 'projects', `"${pr.name}" has no GitHub/live link.`, 'Link the repo or live demo so it can be verified.'));
    if (!arr(pr.bullets).some((b) => b?.trim())) issues.push(issue('structure', 'medium', 'projects', `"${pr.name}" has no description bullets.`, 'Add 2-3 bullets: what you built, how, and the result.'));
  });
  experience.forEach((ex) => {
    if (!arr(ex.bullets).some((b) => b?.trim())) issues.push(issue('structure', 'medium', 'experience', `"${ex.role || ex.company}" has no description bullets.`, 'Add 2-4 bullets describing your impact.'));
  });

  return { score: clamp(score), issues };
}

function analyzeContent(resume) {
  const bullets = allBullets(resume);
  const issues = [];
  if (!bullets.length) return { score: 30, issues: [issue('content', 'high', 'projects', 'No bullet points to evaluate.', 'Describe projects and experience with bullet points.')], stats: { bullets: 0 } };

  let action = 0;
  let quantified = 0;
  let goodLength = 0;
  let weak = 0;
  const weakExamples = [];
  const noVerb = [];

  for (const b of bullets) {
    const first = (words(b.text)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
    const isVerb = ACTION_VERBS.has(first) || (first.length > 4 && first.endsWith('ed') && !['need', 'speed'].includes(first));
    if (isVerb) action++;
    else noVerb.push(b);
    if (/\d/.test(b.text)) quantified++;
    const n = words(b.text).length;
    if (n >= 8 && n <= 32) goodLength++;
    else if (n > 32) issues.push(issue('content', 'low', b.section, `A bullet in "${b.owner}" is ${n} words long.`, 'Split it or trim to 1-2 lines.'));
    else if (n < 6) issues.push(issue('content', 'low', b.section, `A bullet in "${b.owner}" is very short: "${b.text}"`, 'Add what you did, how, and the result.'));
    const lower = b.text.toLowerCase();
    const hit = WEAK_PHRASES.find((w) => lower.includes(w));
    if (hit) {
      weak++;
      weakExamples.push({ ...b, phrase: hit.trim() });
    }
  }

  const actionRatio = action / bullets.length;
  const quantRatio = quantified / bullets.length;
  const lengthRatio = goodLength / bullets.length;

  if (actionRatio < 0.8) {
    issues.push(issue('content', 'medium', noVerb[0].section, `${noVerb.length} of ${bullets.length} bullets don't start with an action verb (e.g. "${noVerb[0].text.slice(0, 50)}...").`, 'Start each bullet with a strong past-tense verb: Built, Designed, Optimized...'));
  }
  if (quantRatio < 0.4) {
    issues.push(issue('content', 'medium', 'projects', `Only ${quantified} of ${bullets.length} bullets include numbers.`, 'Quantify impact: users, % faster, records processed, team size, accuracy.'));
  }
  weakExamples.slice(0, 3).forEach((w) => issues.push(issue('content', 'medium', w.section, `Weak phrase "${w.phrase}" in "${w.owner}".`, 'Replace with an action verb and the outcome you achieved.')));

  const score = 40 * actionRatio + 35 * Math.min(1, quantRatio / 0.5) + 25 * lengthRatio - Math.min(20, weak * 5);
  return { score: clamp(score), issues, stats: { bullets: bullets.length, actionVerbBullets: action, quantifiedBullets: quantified, weakPhrases: weak } };
}

function analyzeFormatting(resume) {
  const issues = [];
  let score = 100;
  const text = resumeToText(resume);
  const wordCount = words(text).length;

  if (EMOJI.test(text)) {
    score -= 15;
    issues.push(issue('formatting', 'medium', 'general', 'Emojis or pictograms found.', 'Remove them; many ATS systems cannot parse them.'));
  }
  const pronounHits = allBullets(resume).filter((b) => PRONOUNS.test(b.text)).length + (PRONOUNS.test(resume.summary || '') ? 1 : 0);
  if (pronounHits) {
    score -= 10;
    issues.push(issue('formatting', 'low', 'general', `First-person pronouns (I/my/me) used in ${pronounHits} place(s).`, 'CVs are written without pronouns: "Built X" not "I built X".'));
  }
  if (wordCount > 850) {
    score -= 15;
    issues.push(issue('formatting', 'medium', 'general', `About ${wordCount} words, likely more than one page.`, 'Students should fit on one page: trim older or less relevant items.'));
  } else if (wordCount < 180) {
    score -= 15;
    issues.push(issue('formatting', 'medium', 'general', `Only about ${wordCount} words, the CV looks thin.`, 'Add more detail to projects, skills and achievements.'));
  }

  const dates = [...arr(resume.education), ...arr(resume.experience), ...arr(resume.projects)].flatMap((x) => [x.start, x.end]).filter((d) => d && !/present|current/i.test(d));
  const styles = new Set(dates.map((d) => (/^\d{4}$/.test(d) ? 'year' : /^[a-z]{3,9}\.? \d{4}$/i.test(d) ? 'month-year' : /^\d{1,2}[/-]\d{4}$/.test(d) ? 'numeric' : /^\d{4}-\d{2}$/.test(d) ? 'iso' : 'other')));
  if (styles.size > 1) {
    score -= 10;
    issues.push(issue('formatting', 'low', 'general', 'Date formats are inconsistent.', 'Use one style throughout, e.g. "Aug 2023 - May 2027".'));
  }
  const missingDates = [...arr(resume.education).filter((e) => e.institution), ...arr(resume.experience).filter((e) => e.company)].filter((x) => !x.start && !x.end).length;
  if (missingDates) {
    score -= 5;
    issues.push(issue('formatting', 'low', 'general', `${missingDates} education/experience entr${missingDates > 1 ? 'ies are' : 'y is'} missing dates.`, 'Add start and end dates.'));
  }
  const capsLines = text.split('\n').filter((l) => l.length > 25 && l === l.toUpperCase() && /[A-Z]/.test(l));
  if (capsLines.length) {
    score -= 5;
    issues.push(issue('formatting', 'low', 'general', 'Long text written in ALL CAPS.', 'Use normal sentence case; ALL CAPS is harder to read.'));
  }
  if (resume.template === 'modern') {
    issues.push(issue('formatting', 'low', 'general', 'The Modern template uses two columns.', 'Most ATS read it fine, but switch to Classic or Minimal for strict portals.'));
  }
  return { score: clamp(score), issues, stats: { wordCount } };
}

/**
 * Main entry point.
 * @param {object} resume  resume document (plain object)
 * @param {object} opts    { roleId, jobDescription }
 */
export function analyzeResume(resume = {}, { roleId, jobDescription = '' } = {}) {
  const role = getRoleProfile(roleId || resume.targetRole);
  const targets = buildTargets(role, jobDescription);

  const keywords = analyzeKeywords(resume, targets);
  const structure = analyzeStructure(resume, role);
  const content = analyzeContent(resume);
  const formatting = analyzeFormatting(resume);

  const breakdown = { keywords: keywords.score, structure: structure.score, content: content.score, formatting: formatting.score };
  const score = clamp(breakdown.keywords * 0.35 + breakdown.structure * 0.2 + breakdown.content * 0.3 + breakdown.formatting * 0.15);

  const importantMissing = keywords.missing.filter((m) => m.important).slice(0, 6).map((m) => m.keyword);
  const keywordIssues = [];
  if (importantMissing.length) keywordIssues.push(issue('keywords', 'high', 'skills', `Important keywords missing: ${importantMissing.join(', ')}.`, 'Add them only if you genuinely have the skill: in Skills and in a project bullet that shows it.'));
  if (keywords.notInSkills.length) keywordIssues.push(issue('keywords', 'low', 'skills', `Used in your projects but not listed in Skills: ${keywords.notInSkills.slice(0, 6).join(', ')}.`, 'List them in the Skills section too so ATS keyword filters pick them up.'));

  const projectRanking = rankItems(resume.projects, projectText, targets, (p, i) => p.name || `Project ${i + 1}`);
  const experienceRanking = rankItems(resume.experience, experienceText, targets, (e, i) => e.role || e.company || `Experience ${i + 1}`);
  const req = extractRequirements(jobDescription);

  const recommendations = [];
  if (projectRanking.length > 1) {
    const top = projectRanking.filter((p) => p.relevance > 0).slice(0, 3).map((p) => p.name);
    if (top.length) recommendations.push(`Highlight these projects first: ${top.join(', ')}.`);
    const weakest = projectRanking.filter((p) => p.relevance === 0).map((p) => p.name);
    if (weakest.length) recommendations.push(`Move lower or drop for this role: ${weakest.join(', ')} (no matching keywords).`);
  }
  if (keywords.matched.length) recommendations.push(`Put these matched skills at the start of your Skills section: ${keywords.matched.slice(0, 8).join(', ')}.`);
  if (req.experienceYears && req.experienceYears > 1) recommendations.push(`The job asks for ${req.experienceYears}+ years; lean on internships and substantial projects to show equivalent experience.`);
  role.tips.forEach((t) => recommendations.push(t));

  const sevRank = { high: 0, medium: 1, low: 2 };
  const issues = [...keywordIssues, ...structure.issues, ...content.issues, ...formatting.issues].sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  return {
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Weak',
    breakdown,
    role: { id: role.id, name: role.name },
    keywordSource: targets.source,
    keywords: { matched: keywords.matched, missing: keywords.missing, notInSkills: keywords.notInSkills },
    projectRanking,
    experienceRanking,
    suggestedSectionOrder: role.sectionOrder,
    suggestedActionVerbs: role.actionVerbs,
    requirements: req,
    recommendations,
    issues,
    stats: { ...content.stats, ...formatting.stats }
  };
}
