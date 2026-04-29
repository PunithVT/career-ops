import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync, createReadStream } from 'fs';
import * as users from './lib/users.mjs';
import * as data from './lib/data.mjs';
import { evaluateJob, runMode, fetchUrl, generatePDF } from './lib/evaluate.mjs';

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

function requireApiKey(req, res, next) {
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server' });
  next();
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseSetup(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  return (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || username.length < 3) return res.status(400).json({ error: 'Username must be 3+ characters' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
    const user = await users.createUser(username.trim(), password);
    data.initUserData(user.id, ROOT);
    req.session.userId = user.id;
    res.json({ username: user.username });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const user = await users.authenticate(username?.trim(), password);
    req.session.userId = user.id;
    res.json({ username: user.username });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.post('/auth/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// ─── Setup ────────────────────────────────────────────────────────────────────

app.get('/api/setup-status', requireAuth, (req, res) => {
  res.json(data.getSetupStatus(req.userDataPath));
});

// ─── CV ───────────────────────────────────────────────────────────────────────

app.get('/api/cv', requireAuth, (req, res) => res.json({ content: data.readFile(req.userDataPath, 'cv.md') }));

app.put('/api/cv', requireAuth, (req, res) => {
  if (!req.body.content) return res.status(400).json({ error: 'Content required' });
  data.writeFile(req.userDataPath, 'cv.md', req.body.content);
  res.json({ ok: true });
});

// ─── Profile config ───────────────────────────────────────────────────────────

app.get('/api/profile-config', requireAuth, (req, res) =>
  res.json({ content: data.readFile(req.userDataPath, 'config/profile.yml') }));

app.put('/api/profile-config', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'config/profile.yml', req.body.content ?? '');
  res.json({ ok: true });
});

app.get('/api/profile-md', requireAuth, (req, res) =>
  res.json({ content: data.readFile(req.userDataPath, 'modes/_profile.md') }));

app.put('/api/profile-md', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'modes/_profile.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Applications ─────────────────────────────────────────────────────────────

app.get('/api/applications', requireAuth, (req, res) =>
  res.json(data.parseApplications(req.userDataPath)));

app.get('/api/applications/raw', requireAuth, (req, res) =>
  res.json({ content: data.readFile(req.userDataPath, 'data/applications.md') }));

app.put('/api/applications/raw', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'data/applications.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

app.get('/api/pipeline', requireAuth, (req, res) =>
  res.json({ content: data.readFile(req.userDataPath, 'data/pipeline.md') }));

app.put('/api/pipeline', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'data/pipeline.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get('/api/reports', requireAuth, (req, res) => res.json(data.listReports(req.userDataPath)));

app.get('/api/reports/:id', requireAuth, (req, res) => {
  const content = data.getReport(req.userDataPath, req.params.id);
  if (content === null) return res.status(404).json({ error: 'Report not found' });
  res.json({ content });
});

// ─── Portals ──────────────────────────────────────────────────────────────────

app.get('/api/portals', requireAuth, (req, res) => {
  let content = data.readFile(req.userDataPath, 'portals.yml');
  if (!content) {
    // Bootstrap from example
    const example = join(ROOT, 'templates', 'portals.example.yml');
    if (existsSync(example)) content = readFileSync(example, 'utf8');
  }
  res.json({ content });
});

app.put('/api/portals', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'portals.yml', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Follow-ups ───────────────────────────────────────────────────────────────

app.get('/api/followups-md', requireAuth, (req, res) =>
  res.json({ content: data.readFile(req.userDataPath, 'data/follow-ups.md') }));

app.put('/api/followups-md', requireAuth, (req, res) => {
  data.writeFile(req.userDataPath, 'data/follow-ups.md', req.body.content ?? '');
  res.json({ ok: true });
});

// ─── Evaluate (SSE streaming) ─────────────────────────────────────────────────

app.post('/api/evaluate', requireAuth, requireApiKey, async (req, res) => {
  let { jd } = req.body ?? {};
  if (!jd?.trim()) return res.status(400).json({ error: 'Job description or URL required' });
  if (/^https?:\/\//i.test(jd.trim())) {
    const fetched = await fetchUrl(jd.trim());
    if (fetched) jd = fetched;
  }
  if (!data.getSetupStatus(req.userDataPath).cv)
    return res.status(400).json({ error: 'Please add your CV first (Profile tab)' });

  const send = sseSetup(res);
  try {
    const result = await evaluateJob(jd, req.userDataPath, ROOT, chunk => send({ chunk }));
    const reportId = data.saveReport(req.userDataPath, result, jd.slice(0, 200));
    send({ done: true, reportId });
  } catch (e) { send({ error: e.message }); }
  res.end();
});

// ─── Generic AI mode (SSE streaming) ─────────────────────────────────────────

const ALLOWED_MODES = ['ofertas', 'contacto', 'deep', 'interview-prep', 'training', 'project', 'patterns', 'followup', 'apply', 'batch'];

app.post('/api/ai/:mode', requireAuth, requireApiKey, async (req, res) => {
  const { mode } = req.params;
  if (!ALLOWED_MODES.includes(mode))
    return res.status(400).json({ error: `Unknown mode: ${mode}` });

  const { input, extraContext } = req.body ?? {};
  if (!input?.trim()) return res.status(400).json({ error: 'Input required' });

  const send = sseSetup(res);
  try {
    const result = await runMode(mode, input, req.userDataPath, ROOT, chunk => send({ chunk }), extraContext || '');
    const reportId = data.saveReport(req.userDataPath, result, input.slice(0, 200));
    send({ done: true, reportId });
  } catch (e) { send({ error: e.message }); }
  res.end();
});

// ─── URL fetch helper ─────────────────────────────────────────────────────────

app.post('/api/fetch-url', requireAuth, async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'URL required' });
  const text = await fetchUrl(url);
  if (!text) return res.status(422).json({ error: 'Could not fetch URL — paste the JD text directly' });
  res.json({ text });
});

// ─── Scanner ──────────────────────────────────────────────────────────────────

app.post('/api/scan', requireAuth, async (req, res) => {
  const userPath = req.userDataPath;

  // Ensure user has portals.yml
  const portalsPath = join(userPath, 'portals.yml');
  if (!existsSync(portalsPath)) {
    const example = join(ROOT, 'templates', 'portals.example.yml');
    if (existsSync(example)) copyFileSync(example, portalsPath);
    else return res.status(400).json({ error: 'No portals.yml configured. Go to Scanner tab and set up your portals first.' });
  }

  const send = sseSetup(res);
  send({ chunk: 'Starting scanner...\n' });

  const args = ['--no-warnings', join(ROOT, 'scan.mjs')];
  if (req.body?.dryRun) args.push('--dry-run');
  if (req.body?.company) args.push('--company', req.body.company);

  const proc = spawn('node', args, {
    cwd: userPath,
    env: { ...process.env, CAREER_OPS_DATA_PATH: userPath }
  });

  proc.stdout.on('data', d => send({ chunk: d.toString() }));
  proc.stderr.on('data', d => send({ chunk: `[stderr] ${d}` }));
  proc.on('close', code => {
    send({ done: true, exitCode: code });
    res.end();
  });
  proc.on('error', e => { send({ error: e.message }); res.end(); });
});

// ─── Patterns (analyze-patterns.mjs + AI) ────────────────────────────────────

app.post('/api/patterns', requireAuth, requireApiKey, async (req, res) => {
  const send = sseSetup(res);
  send({ chunk: 'Running pattern analysis...\n\n' });

  // Run analyze-patterns.mjs with user's cwd
  let patternJson = '';
  try {
    patternJson = await runScript(join(ROOT, 'analyze-patterns.mjs'), req.userDataPath);
  } catch (e) {
    send({ error: `Pattern analysis failed: ${e.message}` });
    return res.end();
  }

  // Pass JSON + patterns.md to Claude for interpretation
  const extraContext = `## Pattern Analysis Data (JSON)\n\n\`\`\`json\n${patternJson}\n\`\`\``;
  try {
    await runMode('patterns',
      'Analyze these patterns and provide actionable recommendations to improve my job search targeting.',
      req.userDataPath, ROOT, chunk => send({ chunk }), extraContext
    );
    send({ done: true });
  } catch (e) { send({ error: e.message }); }
  res.end();
});

// ─── Follow-up cadence ────────────────────────────────────────────────────────

app.get('/api/followup-cadence', requireAuth, async (req, res) => {
  try {
    const json = await runScript(join(ROOT, 'followup-cadence.mjs'), req.userDataPath);
    res.json(JSON.parse(json));
  } catch (e) {
    // If no data yet, return empty structure
    res.json({ overdue: [], upcoming: [], contacts: [] });
  }
});

app.post('/api/followup-draft', requireAuth, requireApiKey, async (req, res) => {
  const { applicationContext, type } = req.body ?? {};
  if (!applicationContext) return res.status(400).json({ error: 'Application context required' });

  const send = sseSetup(res);
  const input = `Generate a ${type || 'follow-up'} message for this application:\n\n${applicationContext}`;
  try {
    await runMode('followup', input, req.userDataPath, ROOT, chunk => send({ chunk }));
    send({ done: true });
  } catch (e) { send({ error: e.message }); }
  res.end();
});

// ─── PDF CV generation ────────────────────────────────────────────────────────

app.post('/api/pdf', requireAuth, requireApiKey, async (req, res) => {
  let { jd } = req.body ?? {};
  if (!jd?.trim()) return res.status(400).json({ error: 'Job description or URL required' });
  if (/^https?:\/\//i.test(jd.trim())) {
    const fetched = await fetchUrl(jd.trim());
    if (fetched) jd = fetched;
  }
  if (!data.getSetupStatus(req.userDataPath).cv)
    return res.status(400).json({ error: 'Please add your CV first (Profile tab)' });

  const send = sseSetup(res);
  try {
    const { pdfFilename } = await generatePDF(jd, req.userDataPath, ROOT, msg => send({ chunk: msg }));
    send({ done: true, filename: pdfFilename });
  } catch (e) {
    send({ error: `PDF generation failed: ${e.message}. Make sure Playwright is installed: npx playwright install chromium` });
  }
  res.end();
});

app.get('/api/pdf/download/:filename', requireAuth, (req, res) => {
  const safe = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe.endsWith('.pdf')) return res.status(400).json({ error: 'Invalid filename' });
  const filePath = join(req.userDataPath, 'output', safe);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.setHeader('Content-Type', 'application/pdf');
  createReadStream(filePath).pipe(res);
});

// ─── Pipeline auto-process ────────────────────────────────────────────────────

app.post('/api/pipeline/process', requireAuth, requireApiKey, async (req, res) => {
  const send = sseSetup(res);

  const pipelineContent = data.readFile(req.userDataPath, 'data/pipeline.md');
  const lines = pipelineContent.split('\n');
  const pending = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => /^\s*-\s*\[\s*\]/.test(line));

  if (!pending.length) {
    send({ chunk: 'No pending URLs found in pipeline.\n' });
    send({ done: true, processed: 0 });
    return res.end();
  }

  send({ chunk: `Found ${pending.length} pending URL(s). Processing…\n\n` });

  const updatedLines = [...lines];
  let processed = 0;

  for (const { line, idx } of pending) {
    const urlMatch = line.match(/https?:\/\/[^\s|]+/);
    if (!urlMatch) { send({ chunk: `  Skipping line (no URL): ${line.trim()}\n` }); continue; }

    const url = urlMatch[0];
    send({ chunk: `[${++processed}/${pending.length}] ${url}\n` });

    // Fetch page
    send({ chunk: `  → Fetching page…\n` });
    let jd = await fetchUrl(url);
    if (!jd) {
      send({ chunk: `  ✗ Could not fetch. Marking as error.\n` });
      updatedLines[idx] = line.replace(/^\s*-\s*\[\s*\]/, m => m.replace('[ ]', '[!]')) + ' — Error: could not fetch';
      continue;
    }

    // Evaluate
    send({ chunk: `  → Evaluating (this takes ~30s)…\n` });
    let result = '';
    try {
      result = await evaluateJob(jd, req.userDataPath, ROOT, () => {});
    } catch (e) {
      send({ chunk: `  ✗ Evaluation error: ${e.message}\n` }); continue;
    }

    const reportId = data.saveReport(req.userDataPath, result, jd.slice(0, 200));
    const reportNum = reportId.split('-')[0];

    // Extract score
    const scoreMatch = result.match(/(\d+\.?\d*)\/5/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

    // Extract company from URL
    let company = 'unknown';
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      company = pathParts.find(p => p.length > 2 && !/jobs?|careers?|posting/i.test(p)) || host.split('.')[0];
    } catch {}

    const date = new Date().toISOString().split('T')[0];
    data.addToTracker(req.userDataPath, {
      date, company, role: 'Pending review',
      score: score ? `${score}/5` : '—', status: 'Evaluated',
      pdf: '❌', report: `[${reportNum}](reports/${reportId}.md)`, notes: url
    });

    updatedLines[idx] = `- [x] #${reportNum} | ${url} | ${company} | ${score ? score + '/5' : '—'}`;
    send({ chunk: `  ✓ Score: ${score ?? 'N/A'}/5 | Report #${reportNum} saved\n` });
  }

  data.writeFile(req.userDataPath, 'data/pipeline.md', updatedLines.join('\n'));
  send({ chunk: `\n✓ Done. ${processed} URL(s) processed.\n` });
  send({ done: true, processed });
  res.end();
});

// ─── Script runner helper ─────────────────────────────────────────────────────

function runScript(scriptPath, cwd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['--no-warnings', scriptPath, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CAREER_OPS_DATA_PATH: cwd }
    });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => {
      if (code !== 0) reject(new Error(err.trim() || `Exit ${code}`));
      else resolve(out);
    });
    proc.on('error', reject);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`career-ops web app running → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('[WARNING] ANTHROPIC_API_KEY not set — AI features will fail');
});
