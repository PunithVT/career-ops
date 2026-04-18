import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function read(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

export async function evaluateJob(jdText, userDataPath, rootPath, onChunk) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const sharedMd = read(join(rootPath, 'modes', '_shared.md'));
  const ofertaMd = read(join(rootPath, 'modes', 'oferta.md'));
  const cv       = read(join(userDataPath, 'cv.md'));
  const profile  = read(join(userDataPath, 'config', 'profile.yml'));
  const archMd   = read(join(userDataPath, 'modes', '_profile.md'));

  const system = [
    {
      type: 'text',
      text: `${sharedMd}\n\n---\n\n${ofertaMd}`,
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: [
        '## Candidate CV',
        cv || '(not yet provided)',
        '## Profile Configuration (YAML)',
        profile || '(not yet provided)',
        '## Archetype Preferences',
        archMd || '(not yet provided)'
      ].join('\n\n'),
      cache_control: { type: 'ephemeral' }
    }
  ];

  const userMessage =
    'Please evaluate this job posting and provide the complete A–G evaluation blocks:\n\n' + jdText;

  let fullText = '';

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userMessage }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }

  return fullText;
}

export async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops-bot/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip HTML tags and collapse whitespace
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
