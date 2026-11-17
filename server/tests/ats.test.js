import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResume } from '../src/services/atsAnalyzer.js';
import { extractKeywords, mentions, normalize } from '../src/services/keywords.js';

const strong = {
  targetRole: 'full-stack-developer',
  template: 'classic',
  personal: { fullName: 'Asha Verma', email: 'asha@example.com', phone: '+91 98765 43210', linkedin: 'linkedin.com/in/asha', github: 'github.com/asha' },
  summary: 'Final-year B.Tech student building full stack MERN applications with React, Node.js and MongoDB, looking for a full stack developer role.',
  education: [{ institution: 'LPU', degree: 'B.Tech', field: 'CSE', start: '2022', end: '2026', score: '8.4 CGPA' }],
  experience: [{ role: 'Web Developer Intern', company: 'Acme', start: '2025', end: '2025', bullets: ['Built 6 reusable React components that cut page build time by 30% across the admin dashboard.'] }],
  projects: [
    { name: 'EventFlow', tech: 'React, Node.js, Express, MongoDB, Stripe, Socket.io', link: 'github.com/x', bullets: ['Developed an event ticketing platform with Stripe payments serving 200+ test users and QR check-in.', 'Implemented JWT authentication and role-based access for organizers, attendees and admins.'] },
    { name: 'Weather Poem', tech: 'Python', link: 'github.com/y', bullets: ['Wrote a small script that turns weather data into short poems for 5 cities daily.'] }
  ],
  skills: [{ category: 'Languages', items: ['JavaScript', 'TypeScript', 'HTML', 'CSS'] }, { category: 'Frameworks', items: ['React', 'Node.js', 'Express', 'MongoDB', 'Git'] }],
  certifications: [],
  achievements: [{ text: 'Solved 400+ problems on LeetCode' }],
  activities: []
};

test('keyword matching handles aliases and symbols', () => {
  const t = normalize('Skilled in ReactJS, NodeJS, C++ and CI/CD pipelines. Next month I will learn Go.');
  assert.ok(mentions(t, 'react'));
  assert.ok(mentions(t, 'node.js'));
  assert.ok(mentions(t, 'c++'));
  assert.ok(mentions(t, 'ci/cd'));
  assert.ok(!mentions(t, 'next.js'), '"next month" must not count as Next.js');
  assert.ok(!mentions(normalize('JavaScript developer'), 'java'), 'JavaScript must not count as Java');
});

test('extracts keywords from a job description', () => {
  const kws = extractKeywords('We need a React developer with TypeScript, REST APIs, Docker and AWS. React experience is a must. Go is a plus.').map((k) => k.keyword);
  assert.equal(kws[0], 'react');
  for (const k of ['typescript', 'rest api', 'docker', 'aws']) assert.ok(kws.includes(k), k);
  assert.ok(!kws.includes('go'), 'ambiguous "go" not extracted from prose');
});

test('strong CV scores well and ranks relevant project first', () => {
  const r = analyzeResume(strong, {});
  assert.ok(r.score >= 70, `score ${r.score}`);
  assert.equal(r.keywordSource, 'role-profile');
  assert.equal(r.projectRanking[0].name, 'EventFlow');
  assert.ok(r.keywords.matched.includes('react'));
});

test('job description drives missing keywords', () => {
  const r = analyzeResume(strong, { jobDescription: 'Looking for Docker, Kubernetes, AWS and React skills. Docker required.' });
  assert.equal(r.keywordSource, 'job-description');
  const missing = r.keywords.missing.map((m) => m.keyword);
  assert.ok(missing.includes('docker') && missing.includes('kubernetes'));
  assert.ok(r.keywords.matched.includes('react'));
});

test('weak CV gets flagged', () => {
  const r = analyzeResume({ personal: { fullName: '' }, projects: [{ name: 'App', bullets: ['I was responsible for the website 🚀'] }] }, { roleId: 'frontend-developer' });
  assert.ok(r.score < 50, `score ${r.score}`);
  const msgs = r.issues.map((i) => i.message).join(' | ');
  assert.match(msgs, /name is missing/);
  assert.match(msgs, /Weak phrase/);
  assert.match(msgs, /Emojis/);
  assert.match(msgs, /pronouns/);
});

test('empty resume does not crash', () => {
  const r = analyzeResume({}, {});
  assert.equal(typeof r.score, 'number');
});
