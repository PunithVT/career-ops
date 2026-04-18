import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as users from './lib/users.mjs';
import * as data from './lib/data.mjs';
import { evaluateJob, fetchUrl } from './lib/evaluate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'career-ops-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = users.getUser(req.session.userId);
  if (!user) { req.session.destroy(); return res.status(401).json({ error: 'Unauthorized' }); }
  req.user = user;
  req.userDataPath = users.getUserDataPath(user.id);
  next();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || username.length < 3) return res.status(400).json({ error: 'Username must be 3+ characters' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
    const user = await users.createUser(username.trim(), password);
    data.initUserData(user.id, ROOT);
    req.session.userId = user.id;
    res.json({ username: user.username });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const user = await users.authenticate(username?.trim(), password);
    req.session.userId = user.id;
    res.json({ username: user.username });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// ─── Setup status ─────────────────────────────────────────────────────────────

app.get('/api/setup-status', requireAuth, (req, res) => {
  res.json(data.getSetupStatus(req.userDataPath));
});

// ─── CV ───────────────────────────────────────────────────────────────────────

app.get('/api/cv', requireAuth, (req, res) => {
  res.json({ content: data.readFile(req.userDataPath, 'cv.md') });
});

app.put('/api/cv', requireAuth, (req, res) => {
  if (!req.body.content) return res.status(400).json({ error: 'Content required' });
  data.writeFile(req.userDataPath, 'cv.md', req.body.content);
  res.json({ ok: true });
});

// ─── Profile config ───────────────────────────────────────────────────────────

app.get('/api/profile-config', requireAuth, (req, res) => {
  res.json({ content: data.readFile(req.userDataPath, 'config/profile.yml') });
});

app.put('/api/profile-config', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'config/profile.yml', req.body.content ?? '');
  res.json({ ok: true });
});

app.get('/api/profile-md', requireAuth, (req, res) => {
  res.json({ content: data.readFile(req.userDataPath, 'modes/_profile.md') });
});

app.put('/api/profile-md', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'modes/_profile.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Applications tracker ─────────────────────────────────────────────────────

app.get('/api/applications', requireAuth, (req, res) => {
  res.json(data.parseApplications(req.userDataPath));
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

app.get('/api/pipeline', requireAuth, (req, res) => {
  res.json({ content: data.readFile(req.userDataPath, 'data/pipeline.md') });
});

app.put('/api/pipeline', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'data/pipeline.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get('/api/reports', requireAuth, (req, res) => {
  res.json(data.listReports(req.userDataPath));
});

app.get('/api/reports/:id', requireAuth, (req, res) => {
  const content = data.getReport(req.userDataPath, req.params.id);
  if (content === null) return res.status(404).json({ error: 'Report not found' });
  res.json({ content });
});

// ─── Evaluate (SSE streaming) ─────────────────────────────────────────────────

app.post('/api/evaluate', requireAuth, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server' });
  }

  let { jd } = req.body ?? {};
  if (!jd?.trim()) return res.status(400).json({ error: 'Job description or URL required' });

  // If input looks like a URL, fetch it first
  if (/^https?:\/\//i.test(jd.trim())) {
    const fetched = await fetchUrl(jd.trim());
    if (fetched) jd = fetched;
  }

  const status = data.getSetupStatus(req.userDataPath);
  if (!status.cv) {
    return res.status(400).json({ error: 'Please add your CV first (Profile → CV tab)' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const result = await evaluateJob(jd, req.userDataPath, ROOT, chunk => send({ chunk }));
    const reportId = data.saveReport(req.userDataPath, result, jd.slice(0, 200));
    send({ done: true, reportId });
  } catch (e) {
    send({ error: e.message });
  }
  res.end();
});

// ─── URL fetch helper ─────────────────────────────────────────────────────────

app.post('/api/fetch-url', requireAuth, async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'URL required' });
  const text = await fetchUrl(url);
  if (!text) return res.status(422).json({ error: 'Could not fetch URL — try pasting the JD text directly' });
  res.json({ text });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`career-ops web app running → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[WARNING] ANTHROPIC_API_KEY not set — evaluations will fail');
  }
});
