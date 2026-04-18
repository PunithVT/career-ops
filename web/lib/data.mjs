import {
  readFileSync, writeFileSync, existsSync,
  mkdirSync, readdirSync, copyFileSync
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureDir(p) { mkdirSync(p, { recursive: true }); }

export function initUserData(userId, rootPath) {
  const userPath = join(__dirname, '..', 'user-data', userId);
  ['config', 'modes', 'data', 'reports', 'output'].forEach(d =>
    ensureDir(join(userPath, d))
  );

  const profileExample = join(rootPath, 'config', 'profile.example.yml');
  if (existsSync(profileExample) && !existsSync(join(userPath, 'config', 'profile.yml'))) {
    copyFileSync(profileExample, join(userPath, 'config', 'profile.yml'));
  }

  const profileTemplate = join(rootPath, 'modes', '_profile.template.md');
  if (existsSync(profileTemplate) && !existsSync(join(userPath, 'modes', '_profile.md'))) {
    copyFileSync(profileTemplate, join(userPath, 'modes', '_profile.md'));
  }

  const appsFile = join(userPath, 'data', 'applications.md');
  if (!existsSync(appsFile)) {
    writeFileSync(appsFile,
      '# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n'
    );
  }

  const pipelineFile = join(userPath, 'data', 'pipeline.md');
  if (!existsSync(pipelineFile)) {
    writeFileSync(pipelineFile,
      '# Pipeline — Pending Job URLs\n\n> Drop URLs here, one per line.\n\n## Pending\n\n\n## Processed\n\n'
    );
  }
}

export function getSetupStatus(userPath) {
  return {
    cv: existsSync(join(userPath, 'cv.md')),
    profile: existsSync(join(userPath, 'config', 'profile.yml')),
    profileMd: existsSync(join(userPath, 'modes', '_profile.md')),
    applications: existsSync(join(userPath, 'data', 'applications.md'))
  };
}

export function readFile(userPath, relPath) {
  const full = join(userPath, relPath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

export function writeFile(userPath, relPath, content) {
  const full = join(userPath, relPath);
  ensureDir(dirname(full));
  writeFileSync(full, content ?? '', 'utf8');
}

export function parseApplications(userPath) {
  const filePath = join(userPath, 'data', 'applications.md');
  if (!existsSync(filePath)) return { applications: [], stats: emptyStats() };

  const lines = readFileSync(filePath, 'utf8').split('\n');
  const apps = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') ||
        trimmed.startsWith('|---') ||
        trimmed.startsWith('| #') ||
        trimmed.startsWith('| ---')) continue;

    const fields = trimmed.split('|').map(f => f.trim()).filter(Boolean);
    if (fields.length < 7) continue;

    const scoreMatch = (fields[4] || '').match(/(\d+\.?\d*)/);
    apps.push({
      num: fields[0] || '',
      date: fields[1] || '',
      company: fields[2] || '',
      role: fields[3] || '',
      score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
      status: (fields[5] || '').replace(/\*\*/g, '').trim(),
      pdf: fields[6] || '',
      report: fields[7] || '',
      notes: fields[8] || ''
    });
  }

  const stats = {
    total: apps.length,
    active: apps.filter(a => ['Applied', 'Responded', 'Interview', 'Offer'].includes(a.status)).length,
    interviews: apps.filter(a => a.status === 'Interview').length,
    offers: apps.filter(a => a.status === 'Offer').length,
    avgScore: apps.length
      ? (apps.reduce((s, a) => s + (a.score || 0), 0) / apps.length).toFixed(1)
      : '—'
  };

  return { applications: apps.reverse(), stats };
}

function emptyStats() {
  return { total: 0, active: 0, interviews: 0, offers: 0, avgScore: '—' };
}

export function listReports(userPath) {
  const dir = join(userPath, 'reports');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .map(f => {
      const stem = f.replace('.md', '');
      const parts = stem.split('-');
      const num = parts[0];
      const date = parts.slice(-3).join('-');
      const company = parts.slice(1, -3).join('-') || 'unknown';
      return { id: stem, filename: f, num, company, date };
    });
}

export function getReport(userPath, id) {
  // Sanitize id to prevent path traversal
  const safe = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const filePath = join(userPath, 'reports', `${safe}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

export function saveReport(userPath, content, jdSnippet) {
  const dir = join(userPath, 'reports');
  ensureDir(dir);

  const existing = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')) : [];
  const maxNum = existing.reduce((max, f) => {
    const n = parseInt(f.split('-')[0], 10) || 0;
    return n > max ? n : max;
  }, 0);

  const num = String(maxNum + 1).padStart(3, '0');
  const date = new Date().toISOString().split('T')[0];

  const companyMatch =
    content.match(/\*\*(?:Empresa|Company)\*\*[:\s|]+([^\n*|]{2,40})/i);
  const company = companyMatch
    ? companyMatch[1].trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)
    : 'unknown';

  const filename = `${num}-${company}-${date}.md`;
  writeFileSync(join(dir, filename), `**Date:** ${date}\n\n${content}`);
  return filename.replace('.md', '');
}

export function addToTracker(userPath, entry) {
  const appsPath = join(userPath, 'data', 'applications.md');
  const content = existsSync(appsPath) ? readFileSync(appsPath, 'utf8') : '# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n';

  const lines = content.split('\n');
  const maxNum = lines.reduce((max, l) => {
    const m = l.match(/^\|\s*(\d+)\s*\|/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);

  const num = maxNum + 1;
  const row = `| ${num} | ${entry.date} | ${entry.company} | ${entry.role} | ${entry.score} | ${entry.status} | ${entry.pdf} | ${entry.report} | ${entry.notes} |`;

  const lastRowIdx = lines.reduce((last, l, i) => (l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---')) ? i : last, -1);
  if (lastRowIdx >= 0) lines.splice(lastRowIdx + 1, 0, row);
  else lines.push(row);

  writeFileSync(appsPath, lines.join('\n'));
  return num;
}

