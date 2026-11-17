import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { auth, signToken } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again in a few minutes.' } });

router.post('/register', limiter, async (req, res, next) => {
  try {
    const { name, email, password, college, course, graduationYear } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const user = await User.create({ name, email, password, college, course, graduationYear: graduationYear || undefined });
    res.status(201).json({ token: signToken(user._id), user });
  } catch (e) {
    next(e);
  }
});

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Incorrect email or password.' });
    res.json({ token: signToken(user._id), user });
  } catch (e) {
    next(e);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.patch('/me', auth, async (req, res, next) => {
  try {
    const allowed = ['name', 'college', 'course', 'graduationYear'];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;
