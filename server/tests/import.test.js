import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, importResume, parseResumeText, sanitizeImported, fileKind } from '../src/services/cvImport.js';

delete process.env.GEMINI_API_KEY; // test the rule-based reader
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = async (name) => (await importResume(await extractText(fs.readFileSync(path.join(dir, name)), name, ''))).data;

test('imports a PDF exported from the app (no bullet glyphs, icon-font dashes)', async () => {
  const r = await load('app-export.pdf');
  assert.equal(r.personal.fullName, 'Aman Gupta');
  assert.equal(r.personal.email, 'aman.gupta@example.com');
  assert.equal(r.personal.github, 'github.com/aman-dev');
  assert.equal(r.personal.portfolio, '', 'email domain is not a portfolio');
  assert.equal(r.education[0].institution, 'Lovely Professional University');
  assert.equal(r.education[0].degree, 'B.Tech');
  assert.deepEqual([r.education[0].start, r.education[0].end], ['Aug 2022', 'May 2026']);
  assert.equal(r.experience[0].role, 'Web Development Intern');
  assert.equal(r.experience[0].company, 'Acme Technologies');
  assert.equal(r.experience[0].type, 'Internship');
  assert.equal(r.projects.length, 2);
  assert.equal(r.projects[0].bullets.length, 3, 'wrapped lines merged back into bullets');
  assert.match(r.projects[0].tech, /React/);
  assert.ok(r.skills.find((g) => g.category === 'Languages').items.includes('JavaScript'));
  assert.equal(r.activities[0].end, 'Present');
});

test('imports a Word CV with different heading names', async () => {
  const r = await load('word-style.docx');
  assert.equal(r.personal.fullName, 'Rahul Sharma');
  assert.match(r.summary, /data analyst role/);
  assert.equal(r.education.length, 2);
  assert.equal(r.education[0].degree, 'B.Tech');
  assert.equal(r.education[0].field, 'Computer Science and Engineering');
  assert.equal(r.education[1].degree, 'Class XII');
  assert.equal(r.education[1].score, '88%');
  assert.equal(r.experience[0].company, 'XYZ Analytics');
  assert.deepEqual(r.projects.map((p) => p.name), ['Sales Insights Dashboard', 'Movie Recommendation System']);
  assert.equal(r.projects[1].link, 'github.com/rahul-dev/movies');
  assert.equal(r.skills.length, 3);
  assert.equal(r.certifications[0].issuer, 'Coursera');
  assert.equal(r.activities[0].role, 'Event Coordinator');
  assert.ok(!JSON.stringify(r).includes('Chess'), 'hobbies are skipped');
});

test('imports a PDF with bullet symbols and wrapped bullets', async () => {
  const r = await load('bullets-style.pdf');
  assert.equal(r.personal.fullName, 'Priya Verma', 'ALL CAPS name is title-cased');
  assert.equal(r.personal.portfolio, 'priyaverma.dev');
  assert.equal(r.experience[0].bullets.length, 2);
  assert.match(r.experience[0].bullets[0], /from 62 to 91\.$/);
  assert.equal(r.projects[0].tech, 'React, Redux, Tailwind CSS', 'Tech: bullet becomes the tech stack');
  assert.equal(r.projects[0].bullets.length, 1);
  assert.equal(r.skills[0].items.length, 10);
  assert.equal(r.education[0].score, '8.1 CGPA');
});

test('rejects empty / unsupported files with a helpful message', async () => {
  await assert.rejects(() => importResume('   \n  '), /couldn't find text/);
  assert.throws(() => fileKind('cv.doc', ''), /\.docx/);
  assert.throws(() => fileKind('photo.png', 'image/png'), /PDF, Word/);
});

test('sanitizer enforces the resume shape', () => {
  const r = sanitizeImported({ personal: { fullName: 42 }, projects: [{ name: 'X', bullets: ['a', 5, null] }, { bullets: ['no name'] }], skills: [{ items: [] }], achievements: ['Won'] });
  assert.equal(r.personal.fullName, '42');
  assert.equal(r.projects.length, 1);
  assert.deepEqual(r.projects[0].bullets, ['a', '5']);
  assert.ok(r.projects[0].id);
  assert.equal(r.skills.length, 0);
  assert.equal(r.achievements[0].text, 'Won');
  assert.deepEqual(parseResumeText('').education, []);
});
