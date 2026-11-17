import { skillDictionary, AMBIGUOUS_TERMS } from '../data/skillDictionary.js';

// Short aliases that cause false positives inside CV prose ("next month", "the rest of").
// The canonical term itself (e.g. "c", "go", "r") is still matched.
const RISKY_IN_CV = new Set(['next', 'rest', 'word', 'shell', 'os', 'ui', 'ts', 'auth', 'real-time', 'responsive', 'payments', 'apis']);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternCache = new Map();

function termRegex(term) {
  if (!patternCache.has(term)) {
    // Custom word boundary that treats + # . as part of a token (c++, c#, node.js)
    patternCache.set(term, new RegExp(`(^|[^a-z0-9+#])${escape(term)}(?=$|[^a-z0-9+#]|\\.(?:\\s|$))`, 'g'));
  }
  const re = patternCache.get(term);
  re.lastIndex = 0;
  return re;
}

export function normalize(text = '') {
  return String(text).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
}

function countTerm(text, term) {
  const m = text.match(termRegex(term));
  return m ? m.length : 0;
}

/** Variants of a canonical keyword (canonical + aliases). */
export function variantsOf(canonical, { forCv = false, forJd = false } = {}) {
  const aliases = skillDictionary[canonical] || [];
  let list = [canonical, ...aliases];
  if (forJd) list = list.filter((v) => !AMBIGUOUS_TERMS.has(v));
  if (forCv) list = [canonical, ...aliases.filter((a) => !RISKY_IN_CV.has(a))];
  return [...new Set(list)];
}

/** Does normalized text mention a canonical keyword (or any safe alias)? */
export function mentions(normText, canonical) {
  return variantsOf(canonical, { forCv: true }).some((v) => countTerm(normText, v) > 0);
}

/**
 * Pull known skills/keywords out of a job description.
 * Returns [{ keyword, count }] sorted by how often they appear.
 */
export function extractKeywords(jobDescription = '') {
  const text = normalize(jobDescription);
  if (!text.trim()) return [];
  const found = [];
  for (const canonical of Object.keys(skillDictionary)) {
    const variants = variantsOf(canonical, { forJd: true });
    const count = variants.reduce((sum, v) => sum + countTerm(text, v), 0);
    if (count > 0) found.push({ keyword: canonical, count });
  }
  // If both a specific term and its generic parent appear, keep both; sort by frequency then name
  return found.sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
}

/** Extract things like "2+ years of experience" from a JD. */
export function extractRequirements(jobDescription = '') {
  const text = normalize(jobDescription);
  const years = text.match(/(\d+)\s*\+?\s*(?:-\s*\d+\s*)?years?/);
  const degree = /(b\.?tech|b\.?e\b|bachelor|m\.?tech|master|mca|bca|b\.?sc|computer science)/.exec(text);
  return {
    experienceYears: years ? Number(years[1]) : null,
    degreeMentioned: degree ? degree[1] : null
  };
}
