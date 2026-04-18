import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function read(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function buildContext(userDataPath) {
  return [
    '## Candidate CV',
    read(join(userDataPath, 'cv.md')) || '(not yet provided)',
    '## Profile Configuration (YAML)',
    read(join(userDataPath, 'config', 'profile.yml')) || '(not yet provided)',
    '## Archetype Preferences',
    read(join(userDataPath, 'modes', '_profile.md')) || '(not yet provided)'
  ].join('\n\n');
}

async function streamMessages(system, userMessage, onChunk, maxTokens = 4096) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let fullText = '';
  const s = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }]
  });
  for await (const event of s) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return fullText;
}

// ── Single job evaluation ─────────────────────────────────────────────────────

export async function evaluateJob(jdText, userDataPath, rootPath, onChunk) {
  const sharedMd = read(join(rootPath, 'modes', '_shared.md'));
  const ofertaMd = read(join(rootPath, 'modes', 'oferta.md'));
  const system = [
    { type: 'text', text: `${sharedMd}\n\n---\n\n${ofertaMd}`, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildContext(userDataPath), cache_control: { type: 'ephemeral' } }
  ];
  return streamMessages(system,
    'Please evaluate this job posting and provide the complete A–G evaluation blocks:\n\n' + jdText,
    onChunk
  );
}

// ── Generic mode runner ───────────────────────────────────────────────────────

export async function runMode(modeName, userMessage, userDataPath, rootPath, onChunk, extraContext = '') {
  const sharedMd = read(join(rootPath, 'modes', '_shared.md'));
  const modeMd   = read(join(rootPath, 'modes', `${modeName}.md`));
  if (!modeMd) throw new Error(`Mode file not found: modes/${modeName}.md`);

  const contextParts = [buildContext(userDataPath)];
  if (extraContext) contextParts.push(extraContext);

  const system = [
    { type: 'text', text: `${sharedMd}\n\n---\n\n${modeMd}`, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: contextParts.join('\n\n'), cache_control: { type: 'ephemeral' } }
  ];
  return streamMessages(system, userMessage, onChunk);
}

// ── PDF CV generation ─────────────────────────────────────────────────────────

export async function generatePDF(jdText, userDataPath, rootPath, onProgress) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const sharedMd = read(join(rootPath, 'modes', '_shared.md'));
  const pdfMd    = read(join(rootPath, 'modes', 'pdf.md'));
  const template = read(join(rootPath, 'templates', 'cv-template.html'));

  const system = [
    { type: 'text', text: `${sharedMd}\n\n---\n\n${pdfMd}`, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildContext(userDataPath), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `## HTML Template\n\nUse this exact template structure, replacing all {{PLACEHOLDERS}} with tailored content:\n\n${template}`, cache_control: { type: 'ephemeral' } }
  ];

  onProgress('Generating tailored CV HTML…\n');

  let fullText = '';
  const s = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system,
    messages: [{
      role: 'user',
      content: `Tailor my CV for this job posting and generate the complete HTML file. Return ONLY the complete HTML starting with <!DOCTYPE html> — no explanation, no markdown code blocks.\n\nJob posting:\n\n${jdText}`
    }]
  });

  for await (const event of s) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }

  // Extract HTML
  let html = fullText.trim();
  const codeBlock = html.match(/```html\n?([\s\S]+?)```/);
  if (codeBlock) html = codeBlock[1].trim();
  const doctypeIdx = html.indexOf('<!DOCTYPE');
  if (doctypeIdx > 0) html = html.slice(doctypeIdx);

  // Rewrite relative font paths to absolute
  const fontsDir = join(rootPath, 'fonts').replace(/\\/g, '/');
  html = html
    .replace(/url\(['"]?\.\/fonts\//g, `url('${fontsDir}/`)
    .replace(/url\(['"]?fonts\//g, `url('${fontsDir}/`);

  // Save HTML + generate PDF
  const date = new Date().toISOString().split('T')[0];
  const slug = slugify(extractCompany(jdText));
  const htmlPath = join(userDataPath, 'output', `cv-${slug}-${date}.html`);
  const pdfFilename = `cv-${slug}-${date}.pdf`;
  const pdfPath = join(userDataPath, 'output', pdfFilename);

  writeFileSync(htmlPath, html);
  onProgress('Running Playwright to generate PDF…\n');

  await runScript(join(rootPath, 'generate-pdf.mjs'), rootPath, [htmlPath, pdfPath]);
  onProgress('PDF ready!\n');

  return { pdfPath, pdfFilename };
}

function extractCompany(text) {
  const m = text.match(/(?:at|@)\s+([A-Z][a-zA-Z0-9\s]{1,20})/);
  return m ? m[1].trim() : 'company';
}

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30);
}

// ── URL fetcher ────────────────────────────────────────────────────────────────

export async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops-bot/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);
  } catch {
    return null;
  }
}

// ── Shared script runner ──────────────────────────────────────────────────────

function runScript(scriptPath, cwd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['--no-warnings', scriptPath, ...args], {
      cwd, stdio: ['ignore', 'pipe', 'pipe']
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
