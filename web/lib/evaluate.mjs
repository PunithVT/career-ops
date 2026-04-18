import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

async function stream(system, userMessage, onChunk) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let fullText = '';
  const s = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
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

  return stream(system,
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

  return stream(system, userMessage, onChunk);
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
