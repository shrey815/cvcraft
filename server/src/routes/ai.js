import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import { aiEnabled, generateJSON, RULES } from '../services/gemini.js';
import { getRoleProfile } from '../data/roleProfiles.js';
import { resumeToText } from '../services/resumeText.js';
import { analyzeResume } from '../services/atsAnalyzer.js';

const router = Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many AI requests. Wait a minute and try again.' } });

const clip = (s, n) => String(s || '').slice(0, n);
const strArr = (v, n = 10) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, n) : []);

router.get('/status', (req, res) => res.json({ enabled: aiEnabled(), model: aiEnabled() ? process.env.GEMINI_MODEL || 'gemini-2.5-flash' : null }));

router.use(auth, aiLimiter);

/**
 * POST /api/ai/assist
 * body: { mode: 'improve'|'bullets'|'grammar'|'verbs', text, context?, roleId? }
 */
router.post('/assist', async (req, res, next) => {
  try {
    const { mode, roleId } = req.body || {};
    const text = clip(req.body?.text, 2500).trim();
    const context = clip(req.body?.context, 300);
    if (!text) return res.status(400).json({ message: 'Write something first, then ask the AI to improve it.' });
    const role = getRoleProfile(roleId);
    const header = `Target role: ${role.name}. ${context ? `Context: ${context}.` : ''}\n${RULES}\n\nInput text:\n"""${text}"""\n`;

    let prompt;
    switch (mode) {
      case 'improve':
        prompt = `${header}\nRewrite the input as a stronger CV description. Give 3 alternative versions with different emphasis.\nReturn JSON: {"suggestions": ["...", "...", "..."], "tip": "one short tip"}`;
        break;
      case 'bullets':
        prompt = `${header}\nConvert the input into 2-4 professional CV bullet points (one per line of meaning).\nReturn JSON: {"bullets": ["...", "..."], "tip": "one short tip"}`;
        break;
      case 'grammar':
        prompt = `Correct grammar, spelling and punctuation in the input. Keep the meaning, tone and length. Do not add content.\nInput:\n"""${text}"""\nReturn JSON: {"corrected": "...", "changes": ["short description of each fix"]}`;
        break;
      case 'verbs':
        prompt = `${header}\nSuggest 8 strong action verbs that would fit this text for a ${role.name} CV, and show the input rewritten with the best one.\nReturn JSON: {"verbs": ["..."], "example": "..."}`;
        break;
      default:
        return res.status(400).json({ message: 'Unknown mode' });
    }

    const out = await generateJSON(prompt, { temperature: mode === 'grammar' ? 0.1 : 0.7 });
    res.json({
      mode,
      suggestions: strArr(out.suggestions, 3),
      bullets: strArr(out.bullets, 4),
      verbs: strArr(out.verbs, 10),
      corrected: typeof out.corrected === 'string' ? out.corrected : undefined,
      changes: strArr(out.changes, 10),
      example: typeof out.example === 'string' ? out.example : undefined,
      tip: typeof out.tip === 'string' ? out.tip : undefined
    });
  } catch (e) {
    next(e);
  }
});

/** POST /api/ai/summary  body: { resume, roleId, jobDescription } */
router.post('/summary', async (req, res, next) => {
  try {
    const { resume = {}, roleId, jobDescription } = req.body || {};
    const role = getRoleProfile(roleId || resume.targetRole);
    const prompt = `${RULES}
Write a professional CV summary (2-3 sentences, 40-60 words) for a student targeting: ${role.name}.
Use only facts from the CV below. ${jobDescription ? 'Align wording with the job description where the CV genuinely supports it.' : ''}
CV:
"""${clip(resumeToText(resume), 5000)}"""
${jobDescription ? `Job description:\n"""${clip(jobDescription, 3000)}"""` : ''}
Return JSON: {"suggestions": ["option 1", "option 2"]}`;
    const out = await generateJSON(prompt);
    res.json({ suggestions: strArr(out.suggestions, 3) });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/ai/tailor  body: { resume, roleId, jobDescription }
 * Rewrites the weakest bullets toward the job and explains what to emphasize.
 */
router.post('/tailor', async (req, res, next) => {
  try {
    const { resume = {}, roleId, jobDescription = '' } = req.body || {};
    const role = getRoleProfile(roleId || resume.targetRole);
    const analysis = analyzeResume(resume, { roleId: role.id, jobDescription });
    const bullets = [];
    (resume.projects || []).forEach((p, i) => (p.bullets || []).forEach((b, j) => b?.trim() && bullets.push({ ref: `projects.${i}.${j}`, owner: p.name, text: b })));
    (resume.experience || []).forEach((e, i) => (e.bullets || []).forEach((b, j) => b?.trim() && bullets.push({ ref: `experience.${i}.${j}`, owner: e.role || e.company, text: b })));
    if (!bullets.length) return res.status(400).json({ message: 'Add some project or experience bullets first.' });

    const prompt = `${RULES}
You are tailoring a student's CV for: ${role.name}.
Missing keywords (only weave in if the bullet's content genuinely supports it): ${analysis.keywords.missing.map((m) => m.keyword).slice(0, 12).join(', ') || 'none'}.
Matched keywords: ${analysis.keywords.matched.slice(0, 15).join(', ') || 'none'}.
${jobDescription ? `Job description:\n"""${clip(jobDescription, 3000)}"""` : ''}
Bullets (ref | owner | text):
${bullets.slice(0, 20).map((b) => `${b.ref} | ${b.owner} | ${clip(b.text, 300)}`).join('\n')}

Pick up to 6 bullets that would benefit most from rewriting for this role and rewrite them.
Return JSON: {"rewrites": [{"ref": "projects.0.1", "improved": "...", "why": "short reason"}], "focus": ["2-4 short points on what to emphasize for this job"]}`;
    const out = await generateJSON(prompt);
    const valid = new Map(bullets.map((b) => [b.ref, b]));
    const rewrites = (Array.isArray(out.rewrites) ? out.rewrites : [])
      .filter((r) => r && valid.has(r.ref) && typeof r.improved === 'string')
      .slice(0, 6)
      .map((r) => ({ ref: r.ref, owner: valid.get(r.ref).owner, original: valid.get(r.ref).text, improved: r.improved, why: typeof r.why === 'string' ? r.why : '' }));
    res.json({ rewrites, focus: strArr(out.focus, 4) });
  } catch (e) {
    next(e);
  }
});

export default router;
