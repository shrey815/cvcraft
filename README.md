# CVCraft: Job-Tailored CV Builder for Students

A full stack web app that helps students build an organised, ATS-friendly CV and tailor it to a specific job profile.

**Stack:** React 19 + Vite + Tailwind CSS v4 · Node.js + Express 5 · MongoDB Atlas (Mongoose) · Google Gemini API · JWT auth

## Features

| Module | What it does |
|---|---|
| **0. Import existing CV** | Upload a PDF / Word (.docx) / .txt CV, pick the target role and optionally paste the JD. The app fills every section (Gemini when configured, otherwise a rule-based reader), creates a new editable copy and opens **Job Match** with a guided 4-step checklist to tailor it. The file is read in memory and never stored |
| **1. Student dashboard** | Create, edit and delete CVs, save copies as **versions** (e.g. one per company), and track **completion %** and last **ATS score** for each |
| **2. Structured CV builder** | Guided sections: personal info, summary, education, experience/internships, projects, skills (chip input), certifications, achievements, extracurriculars. Items can be reordered, and the CV **autosaves** |
| **3. Templates** | Classic, Modern (two-column) and Minimal templates with a **live A4 preview**, page-overflow warnings, font, size, accent colour and spacing controls, section reorder/hide/rename, and **one-click PDF** with real selectable text |
| **4. Job profile customisation** | 11 role profiles (Frontend, Backend, Full Stack, SDE, Data Analyst, Data Scientist, DevOps, UI/UX, Mobile, Cybersecurity, General). Paste a JD to see **matched and missing keywords**, **which projects to highlight** (with one-click reorder), skills you used but didn't list, and the recommended section order |
| **5. ATS checker** | Score out of 100 with a breakdown (keywords 35%, bullet quality 30%, structure 20%, formatting 15%). It flags issues by priority, such as missing contact info, weak phrases, missing numbers, pronouns, emojis, inconsistent dates and length, and links each one to its section |
| **6. AI writing assistant** | Gemini-powered: improve text, convert rough notes to bullet points, suggest action verbs, fix grammar, generate a summary from the CV, and **tailor bullets to a JD**. Prompts forbid invented facts and use `[X%]` placeholders for unknown numbers |

The ATS checker and job matching use a rule-based engine (`server/src/services/atsAnalyzer.js`), so they **work without an AI key**. Only module 6 needs Gemini.

## Project structure

```
cv-builder/
├── package.json                One-command scripts: setup, dev, build, start, test
├── render.yaml                 Render blueprint (one free web service)
├── server/                     Express API (also serves the React build in production)
│   ├── src/
│   │   ├── app.js              Express app (routes, security middleware)
│   │   ├── index.js            Entry: connects MongoDB, starts server
│   │   ├── data/
│   │   │   ├── roleProfiles.js     Target roles: skills, section order, tips
│   │   │   └── skillDictionary.js  Keywords + aliases (reactjs → react …)
│   │   ├── services/
│   │   │   ├── atsAnalyzer.js      ATS score, issues, project ranking
│   │   │   ├── keywords.js         JD keyword extraction & matching
│   │   │   ├── cvImport.js         CV upload: PDF/DOCX text extraction + AI / rule-based section parser
│   │   │   ├── gemini.js           Gemini REST wrapper (JSON mode)
│   │   │   └── resumeText.js       Resume → plain text helpers
│   │   ├── models/             User, Resume (Mongoose)
│   │   ├── routes/             auth, resumes, analysis, ai
│   │   └── middleware/         JWT auth, error handler
│   └── tests/                  node:test unit + API tests (+ sample CVs in tests/fixtures)
└── client/                     React app
    └── src/
        ├── pages/              Landing, Auth, Dashboard, Editor
        ├── editor/             Content / Design / Job Match / ATS panels, AI assistant
        ├── preview/CVPreview.jsx   The 3 CV templates
        ├── lib/                API client, section config, completion %
        └── components/ui.jsx   Buttons, inputs, modal, score ring…
```

## Run locally

**You need:** Node.js 18+ and a MongoDB connection string (free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), see step 1 of *Deploy*). A [Gemini API key](https://aistudio.google.com/apikey) is optional; without it everything except the AI buttons works.

```bash
npm run setup                          # installs root, server and client packages
cp server/.env.example server/.env     # then fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev                            # API + website together → open http://localhost:5173
```

To try the production setup locally (one server for site + API):

```bash
npm run build && npm start             # → http://localhost:5000
```

### Tests

```bash
npm test
```

* `ats.test.js`: keyword aliases (`ReactJS` → React, "JavaScript" ≠ Java, "next month" ≠ Next.js), JD extraction, scoring, issue detection.
* `import.test.js`: imports 3 differently formatted sample CVs (app-exported PDF, Word template, PDF with bullet symbols) and checks every section lands in the right place.
* `api.test.js`: full API flow (register/login, CRUD, versions, ownership checks, ATS score saved on the CV, AI disabled state) on an in-memory MongoDB. It downloads a MongoDB binary the first time it runs.

## Deploy (free, public link for anyone)

In production, the Express server also serves the built React app, so the whole project is **one Render web service** plus a free Atlas database. There's no CORS setup and no second host.

**1. Database: MongoDB Atlas (free M0)**
1. Create a free cluster at mongodb.com/atlas.
2. *Database Access* → add a user with a password (avoid `@ : / ?` in it, or URL-encode them).
3. *Network Access* → **Allow access from anywhere (`0.0.0.0/0`)**. Render has no fixed IP on the free plan.
4. *Connect → Drivers* → copy the connection string and add the database name before the `?`:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/cvcraft?retryWrites=true&w=majority`

**2. AI key (optional):** create a key at aistudio.google.com/apikey.

**3. Push this folder to GitHub** (a public or private repo, with `render.yaml` at the root).

**4. Render**
1. render.com → **New → Blueprint** → pick the repo. It reads `render.yaml`.
2. Paste `MONGO_URI` and `GEMINI_API_KEY` when asked. `JWT_SECRET` is generated automatically.
3. Deploy. The first build takes a few minutes. Your app is live at `https://cvcraft-xxxx.onrender.com`.
4. Open it, register, and check that everything works. Share the link.

(Without the blueprint: *New → Web Service* → Build `npm run build`, Start `npm start`, Health check `/api/health`, and set the same env vars plus `NODE_ENV=production`.)

**Free-plan behaviour:** the service sleeps after 15 minutes without visitors, and the next visit takes up to about a minute to wake it. To keep it awake for demos or interviews, add a free monitor on cron-job.org or UptimeRobot that requests `https://<your-app>.onrender.com/api/health` every 10 minutes.

**Updating:** push to GitHub and Render redeploys automatically.

<details><summary>Alternative: frontend on Vercel, API on Render</summary>

* Render web service with root dir `server`, Build `npm install`, Start `npm start`, plus env `CLIENT_URL=https://<your-app>.vercel.app`
* Vercel with root dir `client` and env `VITE_API_URL=https://<your-api>.onrender.com/api` (`vercel.json` handles React Router routes)
</details>

## API reference

All routes except auth, `/roles`, `/health` and `/ai/status` need `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, college?, course?, graduationYear? }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET / PATCH | `/api/auth/me` | Current user / update profile |
| GET | `/api/resumes` | List the user's CVs |
| POST | `/api/resumes` | Create `{ targetRole, title? }`. Pre-fills name, email, college and the role's section order |
| GET / PUT / DELETE | `/api/resumes/:id` | Read / update / delete one CV |
| POST | `/api/resumes/import` | multipart: `file` (PDF/DOCX/TXT ≤ 5 MB), `targetRole`, `jobDescription?`, `title?` → `{ resume, method: ai\|rules, found, warnings, analysis }` |
| POST | `/api/resumes/:id/duplicate` | Save as new version `{ title?, versionLabel?, targetRole? }` |
| GET | `/api/roles` | Role profiles |
| POST | `/api/ats/analyze` | `{ resume, roleId?, jobDescription?, resumeId? }` → score, breakdown, keywords, issues, project ranking, recommendations |
| POST | `/api/ats/keywords` | `{ jobDescription }` → extracted keywords |
| GET | `/api/ai/status` | Whether Gemini is configured |
| POST | `/api/ai/assist` | `{ mode: improve \| bullets \| verbs \| grammar, text, context?, roleId? }` |
| POST | `/api/ai/summary` | `{ resume, roleId?, jobDescription? }` → summary options |
| POST | `/api/ai/tailor` | `{ resume, roleId?, jobDescription }` → rewritten bullets + focus points |

**Security:** bcrypt password hashing, JWT auth, per-user ownership checks on every CV, field allow-listing on updates, Helmet, CORS allow-list, and rate limits on auth (30/15 min) and AI (15/min).

## Ideas to extend

* OCR for scanned/photo CVs (e.g. Tesseract) so image-only PDFs can be imported
* Cover letter generator using the same JD + CV context
* Shareable public CV link (`/p/:slug`) with view counts
* Server-side PDF generation with Puppeteer for pixel-identical exports
* Placement-cell admin view: batch statistics on student CV scores
