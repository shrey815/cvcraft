import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { roleProfiles } from '../data/roleProfiles.js';
import { analyzeResume } from '../services/atsAnalyzer.js';
import { extractKeywords } from '../services/keywords.js';
import Resume from '../models/Resume.js';

const router = Router();

// Public: list role profiles for the role picker
router.get('/roles', (req, res) => res.json({ roles: roleProfiles }));

/**
 * POST /api/ats/analyze
 * body: { resume, roleId?, jobDescription?, resumeId? }
 * Sends the current (possibly unsaved) resume from the editor. If resumeId is given,
 * the score is stored on that CV for the dashboard.
 */
router.post('/ats/analyze', auth, async (req, res, next) => {
  try {
    const { resume, roleId, jobDescription = '', resumeId } = req.body || {};
    if (!resume || typeof resume !== 'object') return res.status(400).json({ message: 'resume is required' });
    const result = analyzeResume(resume, { roleId, jobDescription: String(jobDescription).slice(0, 15000) });
    if (resumeId) await Resume.updateOne({ _id: resumeId, user: req.userId }, { lastScore: result.score }).catch(() => {});
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Just the keywords from a job description (used for live highlighting)
router.post('/ats/keywords', auth, (req, res) => {
  res.json({ keywords: extractKeywords(String(req.body?.jobDescription || '').slice(0, 15000)) });
});

export default router;
