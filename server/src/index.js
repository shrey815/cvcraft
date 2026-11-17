import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';

const { PORT = 5000, MONGO_URI, JWT_SECRET } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');
  createApp().listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) console.log('GEMINI_API_KEY not set: AI assistant is disabled (everything else works).');
  });
} catch (err) {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
}
