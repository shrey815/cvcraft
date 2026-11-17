import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import Resume, { EDITABLE_FIELDS } from '../models/Resume.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import { getRoleProfile } from '../data/roleProfiles.js';
import { extractText, fileKind, importResume } from '../services/cvImport.js';
import { analyzeResume } from '../services/atsAnalyzer.js';

// Keep uploads in memory only: the file is read, parsed and discarded (never stored)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    try {
      fileKind(file.originalname, file.mimetype);
      cb(null, true);
    } catch (e) {
      cb(e);
    }
  }
});

const router = Router();
router.use(auth);

const pick = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => EDITABLE_FIELDS.includes(k)));
const LIST_FIELDS = 'title versionLabel targetRole template parent lastScore updatedAt createdAt personal.fullName summary education experience projects skills certifications achievements activities';

async function findOwned(req, res) {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId });
  if (!resume) res.status(404).json({ message: 'CV not found.' });
  return resume;
}

// List all CVs (enough data for the dashboard to show completion %)
router.get('/', async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.userId }).select(LIST_FIELDS).sort({ updatedAt: -1 }).lean();
    res.json({ resumes });
  } catch (e) {
    next(e);
  }
});

// Create a new CV, pre-filled with the user's name/email and the role's section order
router.post('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const role = getRoleProfile(req.body?.targetRole);
    const data = pick(req.body);
    const resume = await Resume.create({
      title: `${role.name} CV`,
      sectionOrder: role.sectionOrder,
      ...data,
      targetRole: role.id,
      personal: { fullName: user?.name || '', email: user?.email || '', ...(data.personal || {}) },
      education: data.education || (user?.college ? [{ id: randomUUID(), institution: user.college, degree: user.course || '', end: user.graduationYear ? String(user.graduationYear) : '' }] : []),
      user: req.userId
    });
    res.status(201).json({ resume });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/resumes/import  (multipart/form-data)
 * fields: file (PDF/DOCX/TXT, max 5 MB), targetRole, jobDescription?, title?
 * Reads an existing CV, creates a new editable CV set up for the target role,
 * and returns it together with a first job-match analysis.
 */
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a CV file to upload.' });
    const role = getRoleProfile(req.body?.targetRole);
    const jobDescription = String(req.body?.jobDescription || '').slice(0, 15000);
    const text = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    const { data, method, warnings } = await importResume(text, { useAI: req.body?.useAI !== 'false' });

    const user = await User.findById(req.userId);
    data.personal.fullName ||= user?.name || '';
    data.personal.email ||= user?.email || '';

    const analysis = analyzeResume(data, { roleId: role.id, jobDescription });
    const resume = await Resume.create({
      ...data,
      user: req.userId,
      title: String(req.body?.title || '').trim().slice(0, 100) || `${role.name} CV (imported)`,
      versionLabel: 'imported',
      targetRole: role.id,
      jobDescription,
      sectionOrder: role.sectionOrder,
      lastScore: analysis.score
    });

    const found = ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'achievements', 'activities'].filter((k) => (k === 'summary' ? data.summary : data[k].length));
    res.status(201).json({ resume, method, warnings, found, analysis });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const resume = await findOwned(req, res);
    if (resume) res.json({ resume });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const resume = await findOwned(req, res);
    if (!resume) return;
    resume.set(pick(req.body));
    await resume.save();
    res.json({ resume });
  } catch (e) {
    next(e);
  }
});

// Save a copy as a new version (e.g. tailored for a different company/role)
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await findOwned(req, res);
    if (!original) return;
    const siblings = await Resume.countDocuments({ user: req.userId, $or: [{ _id: original.parent || original._id }, { parent: original.parent || original._id }] });
    const copy = original.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    const role = req.body?.targetRole ? getRoleProfile(req.body.targetRole) : null;
    const resume = await Resume.create({
      ...copy,
      parent: original.parent || original._id,
      title: req.body?.title || `${original.title} (copy)`,
      versionLabel: req.body?.versionLabel || `v${siblings + 1}`,
      ...(role ? { targetRole: role.id, sectionOrder: role.sectionOrder } : {}),
      jobDescription: req.body?.keepJobDescription ? original.jobDescription : '',
      lastScore: null
    });
    res.status(201).json({ resume });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const out = await Resume.deleteOne({ _id: req.params.id, user: req.userId });
    if (!out.deletedCount) return res.status(404).json({ message: 'CV not found.' });
    // Child versions stay; detach them from the deleted parent
    await Resume.updateMany({ user: req.userId, parent: req.params.id }, { parent: null });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
