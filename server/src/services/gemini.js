// Thin wrapper over the Gemini REST API (no SDK needed).
// Docs: https://ai.google.dev/api/generate-content

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class AIUnavailableError extends Error {
  constructor(message = 'AI assistant is not configured. Add GEMINI_API_KEY to server/.env.') {
    super(message);
    this.status = 503;
  }
}

// Tried in order: your GEMINI_MODEL first, then fallbacks. Google retires models over time and
// free-tier quotas differ per model, so if one is unavailable/out of quota the next is used.
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
let workingModel = null; // remembered after the first success

export function modelCandidates() {
  const preferred = (process.env.GEMINI_MODEL || '').trim();
  return [...new Set([workingModel, preferred, ...FALLBACK_MODELS].filter(Boolean))];
}

export function currentModel() {
  return workingModel || modelCandidates()[0];
}

export function aiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Ask Gemini for a JSON response.
 * @param {string} prompt
 * @param {{temperature?: number, timeoutMs?: number}} opts
 */
async function callModel(model, prompt, temperature, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' }
      })
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('AI request timed out. Please try again.');
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// "This model doesn't exist / isn't available for this key / out of quota" → try another model
function isUnavailable(status, message = '') {
  return status === 404 || status === 429 || (status === 400 && /not found|not supported|unsupported|no longer available|is not available/i.test(message)) || (status === 403 && /model/i.test(message));
}

// "Model is overloaded / high demand" (503, sometimes 500) → wait briefly, retry once, then try another model
function isOverloaded(status, message = '') {
  return status === 503 || status === 500 || /overloaded|high demand|try again later|unavailable/i.test(message);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS ?? 1500);

/**
 * Ask Gemini for a JSON response.
 * @param {string} prompt
 * @param {{temperature?: number, timeoutMs?: number}} opts
 */
export async function generateJSON(prompt, { temperature = 0.6, timeoutMs = 40000 } = {}) {
  if (!aiEnabled()) throw new AIUnavailableError();
  let lastError;
  let busy = false;

  for (const model of modelCandidates()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { res, data } = await callModel(model, prompt, temperature, timeoutMs);

      if (res.ok) {
        workingModel = model;
        const text = data?.candidates?.[0]?.content?.parts?.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('') || '';
        try {
          return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
        } catch {
          throw Object.assign(new Error('AI returned an unexpected response. Please try again.'), { status: 502 });
        }
      }

      const message = data?.error?.message || `Gemini request failed (${res.status})`;
      if (res.status === 400 && /api key/i.test(message)) throw Object.assign(new Error('Gemini API key is invalid. Check GEMINI_API_KEY.'), { status: 502 });

      if (isOverloaded(res.status, message) && !isUnavailable(res.status, message)) {
        busy = true;
        lastError = message;
        console.warn(`Gemini "${model}" busy (${res.status}), attempt ${attempt}: ${message.slice(0, 100)}`);
        if (attempt === 1) {
          await sleep(RETRY_DELAY_MS);
          continue; // retry the same model once
        }
        break; // still busy → next model
      }
      if (isUnavailable(res.status, message)) {
        if (workingModel === model) workingModel = null;
        if (res.status === 429) busy = true;
        lastError = message;
        console.warn(`Gemini "${model}" unavailable (${res.status}): ${message.slice(0, 100)}. Trying next model.`);
        break; // next model
      }
      throw Object.assign(new Error(message), { status: 502 });
    }
  }
  if (busy) throw Object.assign(new Error('Google\'s AI is very busy right now. Please try again in a minute.'), { status: 503 });
  throw Object.assign(new Error(lastError ? `No Gemini model is available for this API key (${lastError.slice(0, 120)})` : 'No Gemini model is available for this API key.'), { status: 502 });
}

export const RULES = `Rules:
- Write for a student/fresher CV, concise, professional, ATS-friendly plain text.
- Never invent employers, numbers, tools or achievements that are not in the input.
  If a metric would help but is unknown, use a placeholder in square brackets like [X%] or [N users] so the student fills it in.
- Start bullet points with a strong past-tense action verb. No first-person pronouns. No emojis. No markdown.
- Each bullet: one sentence, 12-25 words.`;
