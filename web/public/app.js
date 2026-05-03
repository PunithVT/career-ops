/* ── State ─────────────────────────────────────────────────────────────────── */
let currentUser = null;
let lastReportIds = {};   // keyed by context: 'eval', 'tool'
let allApplications = [];
let currentToolMode = 'ofertas';

/* ── Utility ───────────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

const $ = id => document.getElementById(id);
function show(id) { $(`${id}`)?.classList.remove('hidden'); }
function hide(id) { $(`${id}`)?.classList.add('hidden'); }
function setText(id, t) { const e = $(id); if (e) e.textContent = t; }
function setHtml(id, h) { const e = $(id); if (e) e.innerHTML = h; }

function scoreClass(s) {
  if (!s && s !== 0) return '';
  if (s >= 4.0) return 'score-high';
  if (s >= 3.0) return 'score-mid';
  return 'score-low';
}
function statusClass(s) {
  return { Interview: 'status-interview', Offer: 'status-offer', Rejected: 'status-rejected', Applied: 'status-applied', Responded: 'status-applied' }[s] || '';
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── SSE stream reader ─────────────────────────────────────────────────────── */
async function streamRequest(path, body, { onChunk, onDone, onError }) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      let evt;
      try { evt = JSON.parse(part.slice(6)); } catch { continue; }
      if (evt.chunk && onChunk) onChunk(evt.chunk);
      if (evt.done && onDone) onDone(evt);
      if (evt.error) throw new Error(evt.error);
    }
  }
}

/* ── Screens ───────────────────────────────────────────────────────────────── */
function showScreen(id) {
  ['auth-screen', 'onboarding-screen', 'app-screen'].forEach(s => {
    const el = $(s);
    if (!el) return;
    el.classList.toggle('hidden', s !== id);
  });
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const form = btn.dataset.form;
    $('login-form').classList.toggle('hidden', form !== 'login');
    $('register-form').classList.toggle('hidden', form !== 'register');
  });
});

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('login-error');
  try {
    currentUser = await api('POST', '/auth/login', {
      username: $('login-username').value.trim(),
      password: $('login-password').value
    });
    afterLogin();
  } catch (err) { show('login-error'); setText('login-error', err.message); }
});

$('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('reg-error');
  try {
    currentUser = await api('POST', '/auth/register', {
      username: $('reg-username').value.trim(),
      password: $('reg-password').value
    });
    afterLogin();
  } catch (err) { show('reg-error'); setText('reg-error', err.message); }
});

$('logout-btn').addEventListener('click', async () => {
  await api('POST', '/auth/logout');
  currentUser = null;
  showScreen('auth-screen');
});

async function afterLogin() {
  setText('sidebar-username', currentUser.username);
  const status = await api('GET', '/api/setup-status');
  $('api-key-banner').classList.toggle('hidden', !!status.aiEnabled);
  if (!status.cv) { await startOnboarding(); }
  else { showScreen('app-screen'); switchTab('dashboard'); loadDashboard(); }
}

/* ── Onboarding ────────────────────────────────────────────────────────────── */
let onboardProfileContent = '';

async function startOnboarding() {
  showScreen('onboarding-screen');
  setStep(1);
  const res = await api('GET', '/api/profile-config');
  onboardProfileContent = res.content || '';
}

function setStep(n) {
  document.querySelectorAll('.onboard-step').forEach(el =>
    el.classList.toggle('active', el.id === `onboard-step-${n}`));
  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
}

window.onboardNext = async function(step) {
  if (step === 1) {
    const cv = $('onboard-cv').value.trim();
    if (!cv) { show('onboard-cv-error'); setText('onboard-cv-error', 'Please paste your CV'); return; }
    hide('onboard-cv-error');
    await api('PUT', '/api/cv', { content: cv });
    $('onboard-profile').value = onboardProfileContent;
    setStep(2);
  } else if (step === 2) {
    const profile = $('onboard-profile').value.trim();
    if (!profile) { show('onboard-profile-error'); setText('onboard-profile-error', 'Profile config cannot be empty'); return; }
    hide('onboard-profile-error');
    await api('PUT', '/api/profile-config', { content: profile });
    setStep(3);
  }
};
window.onboardBack = step => setStep(step - 1);
window.finishOnboarding = () => { showScreen('app-screen'); switchTab('dashboard'); loadDashboard(); };

/* ── Navigation ────────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(item =>
  item.addEventListener('click', () => switchTab(item.dataset.tab))
);

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(el =>
    el.classList.toggle('active', el.dataset.panel === tab));
  if (tab === 'dashboard')  loadDashboard();
  if (tab === 'pipeline')   loadPipeline();
  if (tab === 'reports')    loadReports();
  if (tab === 'profile')    loadProfile();
  if (tab === 'scanner')    loadScanner();
  if (tab === 'followups')  loadFollowups();
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
async function loadDashboard() {
  const { applications, stats } = await api('GET', '/api/applications');
  allApplications = applications;
  const isEmpty = applications.length === 0;
  $('dashboard-empty').classList.toggle('hidden', !isEmpty);
  $('dashboard-tracker').classList.toggle('hidden', isEmpty);
  $('stats-row').classList.toggle('hidden', isEmpty);
  if (isEmpty) return;
  setHtml('stats-row', [
    stat(stats.total, 'Total'), stat(stats.active, 'Active'),
    stat(stats.interviews, 'Interviews'), stat(stats.offers, 'Offers'),
    stat(stats.avgScore, 'Avg score')
  ].join(''));
  renderAppsTable(applications);
}

window.refreshDashboard = loadDashboard;

function stat(val, label) {
  return `<div class="stat-card"><div class="stat-val">${val}</div><div class="stat-label">${label}</div></div>`;
}

function renderAppsTable(apps) {
  const tbody = $('apps-tbody');
  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No applications yet. Evaluate a job to get started.</td></tr>';
    return;
  }
  tbody.innerHTML = apps.map(a => {
    const scoreHtml = a.score != null
      ? `<span class="score-chip ${scoreClass(a.score)}">${a.score}/5</span>` : '—';
    const statusHtml = `<span class="status-chip ${statusClass(a.status)}">${esc(a.status) || '—'}</span>`;
    const rid = extractReportId(a.report || '');
    const reportHtml = rid ? `<a href="#" onclick="openReportFromTracker('${rid}');return false">${a.num || '#'}</a>` : '—';
    return `<tr><td>${esc(a.num)}</td><td>${esc(a.date)}</td><td>${esc(a.company)}</td><td>${esc(a.role)}</td><td>${scoreHtml}</td><td>${statusHtml}</td><td>${reportHtml}</td></tr>`;
  }).join('');
}

function extractReportId(cell) {
  const m = cell.match(/\(reports\/([^)]+)\.md\)/);
  return m ? m[1] : '';
}

function openReportFromTracker(id) {
  switchTab('reports');
  loadReports().then(() => selectReport(id));
}

$('app-filter').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  renderAppsTable(q ? allApplications.filter(a =>
    a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
  ) : allApplications);
});

/* ── Evaluate ──────────────────────────────────────────────────────────────── */
window.runEvaluation = async function() {
  const jd = $('eval-jd').value.trim();
  if (!jd) return showToast('Paste a job description or URL first', 'error');

  const btn = $('eval-btn');
  const output = $('eval-output');
  const statusEl = $('eval-status');

  btn.disabled = true; btn.textContent = '⏳ Evaluating…';
  statusEl.textContent = 'Streaming…';
  output.textContent = ''; output.className = 'markdown-body';
  hide('save-report-btn');

  let raw = '';
  try {
    await streamRequest('/api/evaluate', { jd }, {
      onChunk: chunk => { raw += chunk; output.innerHTML = marked.parse(raw); output.scrollTop = output.scrollHeight; },
      onDone: evt => {
        lastReportIds.eval = evt.reportId;
        statusEl.textContent = 'Done — report saved.';
        show('save-report-btn');
        show('eval-pdf-btn');
        loadDashboard();
      }
    });
  } catch (e) { showToast(e.message, 'error'); statusEl.textContent = ''; }
  finally { btn.disabled = false; btn.textContent = '⚡ Evaluate'; }
};

window.viewSavedReport = function(ctx) {
  const id = lastReportIds[ctx];
  if (!id) return;
  switchTab('reports');
  loadReports().then(() => selectReport(id));
};

/* ── PDF CV generation ─────────────────────────────────────────────────────── */
window.generatePDF = async function(ctx) {
  const jd = ctx === 'eval' ? $('eval-jd').value.trim() : $('tool-output').textContent;
  if (!jd) return showToast('No JD text to generate PDF from', 'error');

  const btn = $('eval-pdf-btn');
  btn.disabled = true; btn.textContent = '⏳ Generating…';

  let filename = null;
  try {
    await streamRequest('/api/pdf', { jd }, {
      onChunk: chunk => { setText('eval-status', chunk.replace(/\n/g, ' ').trim()); },
      onDone: evt => { filename = evt.filename; }
    });
    if (filename) {
      // Trigger download
      const a = document.createElement('a');
      a.href = `/api/pdf/download/${encodeURIComponent(filename)}`;
      a.download = filename;
      a.click();
      showToast('PDF downloaded!');
    }
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '⬇ Generate PDF CV';
  }
};

/* ── Tools tab ─────────────────────────────────────────────────────────────── */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentToolMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.mode-panel').forEach(p =>
      p.classList.toggle('active', p.dataset.mode === currentToolMode));
    setText('tool-output-title', 'Output');
    $('tool-output').className = 'markdown-body eval-placeholder';
    $('tool-output').textContent = 'Run a tool on the left to see results here.';
    hide('tool-report-btn');
  });
});

document.querySelectorAll('.tool-run-btn').forEach(btn => {
  btn.addEventListener('click', () => runTool(btn));
});

async function runTool(triggerBtn) {
  const mode = currentToolMode;
  const panel = document.querySelector(`.mode-panel[data-mode="${mode}"]`);
  const textarea = panel?.querySelector('.tool-input');
  const statusEl = panel?.querySelector('.tool-status');

  // Build input message based on mode
  let input = textarea?.value.trim() || '';
  let extraContext = '';

  if (mode === 'deep') {
    const company = $('deep-company').value.trim();
    const role = $('deep-role').value.trim();
    if (!company || !role) return showToast('Company name and role are required', 'error');
    input = `Generate a deep research brief for: Company = "${company}", Role = "${role}".\n\nAdditional context:\n${input}`;
  } else if (mode === 'contacto') {
    const company = $('contact-company').value.trim();
    const role = $('contact-role').value.trim();
    if (!company || !role) return showToast('Company name and role are required', 'error');
    input = `Generate LinkedIn outreach messages for: Company = "${company}", Role = "${role}".\n\nContext:\n${input}`;
  } else if (mode === 'interview-prep') {
    const company = $('prep-company').value.trim();
    const role = $('prep-role').value.trim();
    if (!company || !role) return showToast('Company name and role are required', 'error');
    input = `Prepare interview intel for: Company = "${company}", Role = "${role}".\n\nContext:\n${input}`;
  } else if (mode === 'apply') {
    const company = $('apply-company').value.trim();
    const role = $('apply-role').value.trim();
    if (!company || !role) return showToast('Company and role are required', 'error');
    if (!input) return showToast('Paste the application form questions', 'error');
    input = `Generate tailored answers for a job application at "${company}" for the role "${role}".\n\nApplication form questions:\n\n${input}`;
  } else if (!input) {
    return showToast('Please fill in the input first', 'error');
  }

  const output = $('tool-output');
  output.textContent = '';
  output.className = 'markdown-body';
  setText('tool-output-title', mode.replace(/-/g, ' '));
  triggerBtn.disabled = true;
  if (statusEl) statusEl.textContent = 'Streaming…';
  hide('tool-report-btn');

  let raw = '';
  try {
    await streamRequest(`/api/ai/${mode}`, { input, extraContext }, {
      onChunk: chunk => { raw += chunk; output.innerHTML = marked.parse(raw); output.scrollTop = output.scrollHeight; },
      onDone: evt => {
        lastReportIds.tool = evt.reportId;
        if (statusEl) statusEl.textContent = 'Done.';
        show('tool-report-btn');
      }
    });
  } catch (e) { showToast(e.message, 'error'); if (statusEl) statusEl.textContent = ''; }
  finally { triggerBtn.disabled = false; }
}

/* ── Scanner ───────────────────────────────────────────────────────────────── */
function setupChipInput(containerId) {
  const el = $(containerId);
  if (el._chipReady) return;
  el._chipReady = true;
  el._values = el._values || [];

  const input = document.createElement('input');
  input.className = 'chip-entry';
  input.type = 'text';
  input.placeholder = el.dataset.placeholder || 'Add…';
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = input.value.trim().replace(/,$/, '');
      if (v && !el._values.includes(v)) {
        el._values.push(v);
        renderChips(el);
      }
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value && el._values.length) {
      el._values.pop();
      renderChips(el);
    }
  });
  el.addEventListener('click', () => input.focus());
  el._input = input;
  renderChips(el);
}

function renderChips(el) {
  el.innerHTML = '';
  for (const v of el._values) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${esc(v)}<span class="chip-x">×</span>`;
    chip.querySelector('.chip-x').addEventListener('click', () => {
      el._values = el._values.filter(x => x !== v);
      renderChips(el);
    });
    el.appendChild(chip);
  }
  el.appendChild(el._input);
}

function setChipValues(containerId, values) {
  const el = $(containerId);
  el._values = Array.isArray(values) ? [...values] : [];
  renderChips(el);
}

function getChipValues(containerId) {
  return $(containerId)._values || [];
}

async function loadScanner() {
  ['chips-title-positive', 'chips-title-negative', 'chips-location-positive', 'chips-location-negative']
    .forEach(setupChipInput);
  const [{ content }, filters] = await Promise.all([
    api('GET', '/api/portals'),
    api('GET', '/api/filters')
  ]);
  $('portals-editor').value = content || '';
  setChipValues('chips-title-positive',    filters.title_positive);
  setChipValues('chips-title-negative',    filters.title_negative);
  setChipValues('chips-location-positive', filters.location_positive);
  setChipValues('chips-location-negative', filters.location_negative);
  $('filter-allow-remote').checked = !!filters.allow_remote;
  document.querySelectorAll('.exp-option input[data-exp]').forEach(cb => {
    cb.checked = filters.experience_levels.some(l => l.toLowerCase() === cb.dataset.exp.toLowerCase());
    cb.onchange = () => syncExperienceConflict(cb);
  });
}

// If user enables an experience level (e.g. Junior) that's also in Avoid Keywords,
// remove the conflicting chip — otherwise the AND logic guarantees zero matches.
function syncExperienceConflict(cb) {
  if (!cb.checked) return;
  const level = cb.dataset.exp.toLowerCase();
  const negChips = $('chips-title-negative');
  const before = negChips._values.length;
  negChips._values = negChips._values.filter(v => v.toLowerCase() !== level);
  if (negChips._values.length !== before) {
    renderChips(negChips);
    showToast(`Removed "${cb.dataset.exp}" from Avoid Keywords (would conflict with experience filter)`);
  }
}

window.saveFilters = async function() {
  const experience_levels = Array.from(document.querySelectorAll('.exp-option input[data-exp]:checked'))
    .map(cb => cb.dataset.exp);

  // Final safety: strip any negative keyword that exactly matches an enabled level
  const enabledLevels = new Set(experience_levels.map(l => l.toLowerCase()));
  const cleanedNegative = getChipValues('chips-title-negative')
    .filter(v => !enabledLevels.has(v.toLowerCase()));
  if (cleanedNegative.length !== getChipValues('chips-title-negative').length) {
    setChipValues('chips-title-negative', cleanedNegative);
  }

  try {
    await api('PUT', '/api/filters', {
      title_positive:    getChipValues('chips-title-positive'),
      title_negative:    cleanedNegative,
      location_positive: getChipValues('chips-location-positive'),
      location_negative: getChipValues('chips-location-negative'),
      allow_remote:      $('filter-allow-remote').checked,
      experience_levels
    });
    // Refresh raw editor so it reflects the rewritten YAML
    const { content } = await api('GET', '/api/portals');
    $('portals-editor').value = content || '';
    showToast('Filters saved');
  } catch (e) { showToast(e.message, 'error'); }
};

window.savePorts = async function() {
  await api('PUT', '/api/portals', { content: $('portals-editor').value });
  showToast('portals.yml saved');
};

window.runScan = async function() {
  const btn = $('scan-btn');
  const log = $('scan-output');
  btn.disabled = true; btn.textContent = '⏳ Scanning…';
  log.textContent = '';

  const append = text => {
    log.textContent += text;
    log.scrollTop = log.scrollHeight;
  };

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        let evt;
        try { evt = JSON.parse(part.slice(6)); } catch { continue; }
        if (evt.chunk) append(evt.chunk);
        if (evt.done) { append('\n✓ Scan complete.'); loadDashboard(); }
        if (evt.error) append(`\n✗ Error: ${evt.error}`);
      }
    }
  } catch (e) { append(`\nError: ${e.message}`); }
  finally { btn.disabled = false; btn.textContent = '📡 Run scan'; }
};

/* ── Patterns ──────────────────────────────────────────────────────────────── */
window.runPatterns = async function() {
  const btn = $('patterns-btn');
  const output = $('patterns-output');
  btn.disabled = true; btn.textContent = '⏳ Analyzing…';
  output.textContent = ''; output.className = 'markdown-body';

  let raw = '';
  try {
    await streamRequest('/api/patterns', {}, {
      onChunk: chunk => { raw += chunk; output.innerHTML = marked.parse(raw); output.scrollTop = output.scrollHeight; },
      onDone: () => {}
    });
  } catch (e) {
    output.className = 'markdown-body eval-placeholder';
    output.textContent = e.message;
  }
  finally { btn.disabled = false; btn.textContent = '📊 Analyze'; }
};

/* ── Follow-ups ────────────────────────────────────────────────────────────── */
async function loadFollowups() {
  const [cadenceRes, mdRes] = await Promise.all([
    api('GET', '/api/followup-cadence').catch(() => ({ overdue: [], upcoming: [] })),
    api('GET', '/api/followups-md')
  ]);

  $('followups-md-editor').value = mdRes.content || '';
  renderFollowupCards(cadenceRes);
}

function renderFollowupCards({ overdue = [], upcoming = [] }) {
  const all = [
    ...overdue.map(a => ({ ...a, urgency: 'overdue' })),
    ...upcoming.map(a => ({ ...a, urgency: 'due-soon' }))
  ];

  const container = $('followup-cards');
  if (!all.length) {
    container.innerHTML = '<p class="followup-empty">No active follow-ups needed right now.</p>';
    return;
  }

  container.innerHTML = all.map((a, i) => `
    <div class="followup-card ${a.urgency}">
      <div class="followup-card-header">
        <span class="followup-company">${esc(a.company || a.Company || '—')}</span>
        <span class="followup-badge ${a.urgency}">${a.urgency === 'overdue' ? '⚠ Overdue' : '⏰ Due soon'}</span>
      </div>
      <div class="followup-role">${esc(a.role || a.Role || '')}</div>
      <div class="followup-meta">Status: ${esc(a.status || a.Status || '—')} · Applied: ${esc(a.date || a.Date || '—')}</div>
      <button class="btn btn-ghost btn-sm" data-followup-idx="${i}">✉ Draft message</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-followup-idx]').forEach(btn => {
    const idx = Number(btn.dataset.followupIdx);
    btn.addEventListener('click', () => draftFollowup(all[idx]));
  });
}

async function draftFollowup(appCtx) {
  showToast('Generating follow-up draft…');

  const res = await fetch('/api/followup-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationContext: JSON.stringify(appCtx), type: 'follow-up' })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', raw = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n'); buf = parts.pop();
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      let evt; try { evt = JSON.parse(part.slice(6)); } catch { continue; }
      if (evt.chunk) raw += evt.chunk;
    }
  }
  $('followups-md-editor').value += `\n\n---\n\n${raw}`;
  showToast('Draft added to the log below');
}

window.saveFollowupsMd = async function() {
  await api('PUT', '/api/followups-md', { content: $('followups-md-editor').value });
  showToast('Follow-ups log saved');
};

/* ── Pipeline ──────────────────────────────────────────────────────────────── */
async function loadPipeline() {
  const { content } = await api('GET', '/api/pipeline');
  $('pipeline-editor').value = content;
}
window.savePipeline = async function() {
  await api('PUT', '/api/pipeline', { content: $('pipeline-editor').value });
  showToast('Pipeline saved');
};

window.processPipeline = async function() {
  // Save first so the server reads latest content
  await api('PUT', '/api/pipeline', { content: $('pipeline-editor').value });

  const btn = $('process-btn');
  const logWrap = $('process-log-wrap');
  const log = $('process-log');
  btn.disabled = true; btn.textContent = '⏳ Processing…';
  log.textContent = '';
  logWrap.classList.remove('hidden');

  const append = t => { log.textContent += t; log.scrollTop = log.scrollHeight; };

  try {
    await streamRequest('/api/pipeline/process', {}, {
      onChunk: chunk => append(chunk),
      onDone: async evt => {
        append(`\nAll done — ${evt.processed} URLs processed.`);
        // Reload pipeline editor with updated content
        const { content } = await api('GET', '/api/pipeline');
        $('pipeline-editor').value = content;
        loadDashboard();
      }
    });
  } catch (e) { append(`\nError: ${e.message}`); showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '⚡ Process all URLs'; }
};

/* ── Reports ───────────────────────────────────────────────────────────────── */
async function loadReports() {
  const reports = await api('GET', '/api/reports');
  const list = $('reports-list');
  if (!reports.length) {
    list.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:.85rem">No reports yet.</div>';
    return;
  }
  list.innerHTML = reports.map(r =>
    `<div class="report-item" data-id="${r.id}" onclick="selectReport('${r.id}')">
      <span class="report-company">${r.company.replace(/-/g, ' ')}</span>
      <span class="report-date">${r.date}</span>
      <span class="report-num">#${r.num}</span>
    </div>`
  ).join('');
}

async function selectReport(id) {
  document.querySelectorAll('.report-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  try {
    const { content } = await api('GET', `/api/reports/${encodeURIComponent(id)}`);
    setText('report-title', id);
    setHtml('report-content', marked.parse(content));
    $('report-content').className = 'markdown-body';
    $('report-content').scrollTop = 0;
  } catch { setText('report-content', 'Could not load report.'); }
}

/* ── Profile ───────────────────────────────────────────────────────────────── */
async function loadProfile() {
  const [cvRes, configRes, mdRes, trackerRes] = await Promise.all([
    api('GET', '/api/cv'),
    api('GET', '/api/profile-config'),
    api('GET', '/api/profile-md'),
    api('GET', '/api/applications/raw')
  ]);
  $('cv-editor').value = cvRes.content;
  $('profile-config-editor').value = configRes.content;
  $('profile-md-editor').value = mdRes.content;
  $('tracker-raw-editor').value = trackerRes.content;
}

window.saveCV = async function() { await api('PUT', '/api/cv', { content: $('cv-editor').value }); showToast('CV saved'); };
window.saveProfileConfig = async function() { await api('PUT', '/api/profile-config', { content: $('profile-config-editor').value }); showToast('Profile config saved'); };
window.saveProfileMd = async function() { await api('PUT', '/api/profile-md', { content: $('profile-md-editor').value }); showToast('Archetypes saved'); };
window.saveTrackerRaw = async function() { await api('PUT', '/api/applications/raw', { content: $('tracker-raw-editor').value }); showToast('Tracker saved'); loadDashboard(); };

/* ── Profile sub-tabs ──────────────────────────────────────────────────────── */
document.querySelectorAll('.ptab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.ptab-panel').forEach(p =>
      p.classList.toggle('active', p.id === btn.dataset.ptab));
  });
});

/* ── Init ──────────────────────────────────────────────────────────────────── */
(async function init() {
  showScreen('auth-screen');
  try {
    currentUser = await api('GET', '/auth/me');
    await afterLogin();
  } catch {
    showScreen('auth-screen');
  }
})();
