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
    el.style.display = s === id ? 'flex' : 'none';
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
async function loadScanner() {
  const { content } = await api('GET', '/api/portals');
  $('portals-editor').value = content || '';
}

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

  container.innerHTML = all.map(a => `
    <div class="followup-card ${a.urgency}">
      <div class="followup-card-header">
        <span class="followup-company">${esc(a.company || a.Company || '—')}</span>
        <span class="followup-badge ${a.urgency}">${a.urgency === 'overdue' ? '⚠ Overdue' : '⏰ Due soon'}</span>
      </div>
      <div class="followup-role">${esc(a.role || a.Role || '')}</div>
      <div class="followup-meta">Status: ${esc(a.status || a.Status || '—')} · Applied: ${esc(a.date || a.Date || '—')}</div>
      <button class="btn btn-ghost btn-sm" onclick="draftFollowup(${JSON.stringify(esc(JSON.stringify(a)))})">✉ Draft message</button>
    </div>
  `).join('');
}

window.draftFollowup = async function(escapedJson) {
  const appCtx = JSON.parse(escapedJson.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
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
  // Show in a simple modal / append to editor
  $('followups-md-editor').value += `\n\n---\n\n${raw}`;
  showToast('Draft added to the log below');
};

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
