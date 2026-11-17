// End-to-end API test against an in-memory MongoDB.
// Skips automatically if mongodb-memory-server cannot start (e.g. no internet to download the binary).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

let mongod;
let app;
let skip = false;

before(async () => {
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    const { createApp } = await import('../src/app.js');
    app = createApp();
  } catch (e) {
    skip = `in-memory MongoDB unavailable: ${e.message}`;
  }
});

after(async () => {
  await mongoose.disconnect().catch(() => {});
  await mongod?.stop();
});

test('auth, resume CRUD, versions, ATS and AI-disabled flow', async (t) => {
  if (skip) return t.skip(skip);
  const reg = await request(app).post('/api/auth/register').send({ name: 'Test Student', email: 'Test@Example.com', password: 'secret12', college: 'LPU', course: 'B.Tech CSE', graduationYear: 2026 });
  assert.equal(reg.status, 201);
  const token = reg.body.token;
  const H = { Authorization: `Bearer ${token}` };

  assert.equal((await request(app).post('/api/auth/register').send({ name: 'x', email: 'test@example.com', password: 'secret12' })).status, 409);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' })).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'secret12' })).status, 200);
  assert.equal((await request(app).get('/api/resumes')).status, 401);

  const created = await request(app).post('/api/resumes').set(H).send({ targetRole: 'data-analyst' });
  assert.equal(created.status, 201);
  const cv = created.body.resume;
  assert.equal(cv.personal.fullName, 'Test Student');
  assert.equal(cv.education[0].institution, 'LPU');
  assert.equal(cv.sectionOrder[1], 'skills');

  const upd = await request(app).put(`/api/resumes/${cv._id}`).set(H).send({ summary: 'Hello', user: '000000000000000000000000', skills: [{ id: 'a', category: 'Tools', items: ['SQL', 'Excel'] }] });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.resume.summary, 'Hello');
  assert.equal(String(upd.body.resume.user), String(cv.user), 'user field cannot be overwritten');

  const dup = await request(app).post(`/api/resumes/${cv._id}/duplicate`).set(H).send({ targetRole: 'frontend-developer' });
  assert.equal(dup.status, 201);
  assert.equal(dup.body.resume.parent, cv._id);
  assert.equal(dup.body.resume.versionLabel, 'v2');
  assert.equal(dup.body.resume.targetRole, 'frontend-developer');

  const list = await request(app).get('/api/resumes').set(H);
  assert.equal(list.body.resumes.length, 2);

  const ats = await request(app).post('/api/ats/analyze').set(H).send({ resume: upd.body.resume, resumeId: cv._id, jobDescription: 'SQL, Excel, Power BI, Tableau and Python required.' });
  assert.equal(ats.status, 200);
  assert.ok(ats.body.keywords.matched.includes('sql'));
  const after = await request(app).get(`/api/resumes/${cv._id}`).set(H);
  assert.equal(after.body.resume.lastScore, ats.body.score);

  const roles = await request(app).get('/api/roles');
  assert.ok(roles.body.roles.length >= 10);

  assert.equal((await request(app).get('/api/ai/status')).body.enabled, false);
  assert.equal((await request(app).post('/api/ai/assist').set(H).send({ mode: 'improve', text: 'made a website' })).status, 503);

  // Import an existing CV (Word) and target a role
  const imp = await request(app).post('/api/resumes/import').set(H).field('targetRole', 'data-analyst').field('jobDescription', 'SQL, Power BI, Python, Excel').attach('file', new URL('./fixtures/word-style.docx', import.meta.url).pathname);
  assert.equal(imp.status, 201, imp.body.message);
  assert.equal(imp.body.resume.personal.fullName, 'Rahul Sharma');
  assert.equal(imp.body.resume.targetRole, 'data-analyst');
  assert.equal(imp.body.method, 'rules');
  assert.ok(imp.body.found.includes('projects'));
  assert.ok(imp.body.analysis.keywords.matched.includes('sql'));
  assert.equal(imp.body.resume.lastScore, imp.body.analysis.score);
  const bad = await request(app).post('/api/resumes/import').set(H).attach('file', Buffer.from('hello'), 'photo.png');
  assert.equal(bad.status, 415);

  // Another user cannot see this CV
  const other = await request(app).post('/api/auth/register').send({ name: 'Other', email: 'o@example.com', password: 'secret12' });
  assert.equal((await request(app).get(`/api/resumes/${cv._id}`).set({ Authorization: `Bearer ${other.body.token}` })).status, 404);

  assert.equal((await request(app).delete(`/api/resumes/${cv._id}`).set(H)).status, 200);
  const remaining = await request(app).get('/api/resumes').set(H);
  assert.equal(remaining.body.resumes[0].parent, null);
});
