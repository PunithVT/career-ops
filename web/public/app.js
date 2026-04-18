/* ── State ─────────────────────────────────────────────────────────────────── */
let currentUser = null;
let currentTab = 'dashboard';
let lastReportId = null;
let allApplications = [];

/* ── Utility ───────────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

function show(id)    { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id)    { document.getElementById(id)?.classList.add('hidden'); }
function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
function setHtml(id, h) { const el = document.getElementById(id); if (el) el.innerHTML = h; }

function scoreClass(s) {
  if (!s) return '';
  if (s >= 4.0) return 'score-high';
  if (s >= 3.0) return 'score-mid';
  return 'score-low';
}

function statusClass(s) {
  const map = {
    Interview: 'status-interview',
    Offer: 'status-offer',
    Rejected: 'status-rejected',
    Applied: 'status-applied',
    Responded: 'status-applied'
  };
  return map[s] || '';
}

/* ── Screens ───────────────────────────────────────────────────────────────── */
function showScreen(id) {
  ['auth-screen', 'onboarding-screen', 'app-screen'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = s === id ? (s === 'app-screen' ? 'flex' : 'flex') : 'none';
  });
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const form = btn.dataset.form;
    document.getElementById('login-form').classList.toggle('hidden', form !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', form !== 'register');
  });
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('login-error');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    currentUser = await api('POST', '/auth/login', { username, password });
    afterLogin();
  } catch (err) {
    show('login-error');
    setText('login-error', err.message);
  }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('reg-error');
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    currentUser = await api('POST', '/auth/register', { username, password });
    afterLogin();
  } catch (err) {
    show('reg-error');
    setText('reg-error', err.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/auth/logout');
  currentUser = null;
  showScreen('auth-screen');
});

async function afterLogin() {
  setText('sidebar-username', currentUser.username);
  const status = await api('GET', '/api/setup-status');
  if (!status.cv) {
    await startOnboarding();
  } else {
    showScreen('app-screen');
    switchTab('dashboard');
    loadDashboard();
  }
}

/* ── Onboarding ────────────────────────────────────────────────────────────── */
let onboardProfileContent = '';

async function startOnboarding() {
  showScreen('onboarding-screen');
  setStep(1);
  // Pre-load profile YAML for step 2
  const res = await api('GET', '/api/profile-config');
  onboardProfileContent = res.content || '';
}

function setStep(n) {
  document.querySelectorAll('.onboard-step').forEach(el => {
    el.classList.toggle('active', el.id === `onboard-step-${n}`);
  });
  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
}

window.onboardNext = async function(step) {
  if (step === 1) {
    const cv = document.getElementById('onboard-cv').value.trim();
    if (!cv) {
      show('onboard-cv-error'); setText('onboard-cv-error', 'Please paste your CV');
      return;
    }
    hide('onboard-cv-error');
    await api('PUT', '/api/cv', { content: cv });
    document.getElementById('onboard-profile').value = onboardProfileContent;
    setStep(2);
  } else if (step === 2) {
    const profile = document.getElementById('onboard-profile').value.trim();
    if (!profile) {
      show('onboard-profile-error'); setText('onboard-profile-error', 'Profile config cannot be empty');
      return;
    }
    hide('onboard-profile-error');
    await api('PUT', '/api/profile-config', { content: profile });
    setStep(3);
  }
};

window.onboardBack = function(step) {
  setStep(step - 1);
};

window.finishOnboarding = function() {
  showScreen('app-screen');
  switchTab('dashboard');
  loadDashboard();
};

/* ── Sidebar navigation ─────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-panel').forEach(el =>
    el.classList.toggle('active', el.dataset.panel === tab)
  );
  if (tab === 'dashboard')  loadDashboard();
  if (tab === 'pipeline')   loadPipeline();
  if (tab === 'reports')    loadReports();
  if (tab === 'profile')    loadProfile();
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
async function loadDashboard() {
  const { applications, stats } = await api('GET', '/api/applications');
  allApplications = applications;
  renderStats(stats);
  renderAppsTable(applications);
}

window.refreshDashboard = loadDashboard;

function renderStats(stats) {
  setHtml('stats-row', [
    stat(stats.total, 'Total'),
    stat(stats.active, 'Active'),
    stat(stats.interviews, 'Interviews'),
    stat(stats.offers, 'Offers'),
    stat(stats.avgScore, 'Avg score')
  ].join(''));
}

function stat(val, label) {
  return `<div class="stat-card"><div class="stat-val">${val}</div><div class="stat-label">${label}</div></div>`;
}

function renderAppsTable(apps) {
  const tbody = document.getElementById('apps-tbody');
  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No applications yet. Evaluate a job to get started.</td></tr>';
    return;
  }
  tbody.innerHTML = apps.map(a => {
    const scoreHtml = a.score
      ? `<span class="score-chip ${scoreClass(a.score)}">${a.score}/5</span>`
      : '—';
    const statusHtml = `<span class="status-chip ${statusClass(a.status)}">${a.status || '—'}</span>`;
    const reportHtml = a.report
      ? `<a href="#" onclick="openReportFromTracker('${extractReportId(a.report)}')">${a.num || '#'}</a>`
      : '—';
    return `<tr>
      <td>${a.num}</td>
      <td>${a.date}</td>
      <td>${esc(a.company)}</td>
      <td>${esc(a.role)}</td>
      <td>${scoreHtml}</td>
      <td>${statusHtml}</td>
      <td>${reportHtml}</td>
    </tr>`;
  }).join('');
}

function extractReportId(reportCell) {
  const m = reportCell.match(/\(reports\/([^)]+)\.md\)/);
  return m ? m[1] : '';
}

function openReportFromTracker(id) {
  if (!id) return;
  switchTab('reports');
  loadReports().then(() => selectReport(id));
}

document.getElementById('app-filter').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  const filtered = q
    ? allApplications.filter(a =>
        a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
      )
    : allApplications;
  renderAppsTable(filtered);
});

/* ── Evaluate ──────────────────────────────────────────────────────────────── */
window.runEvaluation = async function() {
  const jd = document.getElementById('eval-jd').value.trim();
  if (!jd) return showToast('Paste a job description or URL first', 'error');

  const btn = document.getElementById('eval-btn');
  const output = document.getElementById('eval-output');
  const status = document.getElementById('eval-status');

  btn.disabled = true;
  btn.textContent = '⏳ Evaluating…';
  status.textContent = 'Streaming evaluation…';
  output.textContent = '';
  output.className = 'markdown-body';
  hide('save-report-btn');
  lastReportId = null;

  let raw = '';

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        let event;
        try { event = JSON.parse(part.slice(6)); } catch { continue; }

        if (event.chunk) {
          raw += event.chunk;
          output.innerHTML = marked.parse(raw);
          output.scrollTop = output.scrollHeight;
        }
        if (event.done) {
          lastReportId = event.reportId;
          status.textContent = 'Evaluation complete. Report saved.';
          show('save-report-btn');
          await loadDashboard();
        }
        if (event.error) throw new Error(event.error);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
    status.textContent = '';
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Evaluate';
  }
};

window.viewSavedReport = function() {
  if (!lastReportId) return;
  switchTab('reports');
  loadReports().then(() => selectReport(lastReportId));
};

/* ── Pipeline ──────────────────────────────────────────────────────────────── */
async function loadPipeline() {
  const { content } = await api('GET', '/api/pipeline');
  document.getElementById('pipeline-editor').value = content;
}

window.savePipeline = async function() {
  const content = document.getElementById('pipeline-editor').value;
  await api('PUT', '/api/pipeline', { content });
  showToast('Pipeline saved');
};

/* ── Reports ───────────────────────────────────────────────────────────────── */
async function loadReports() {
  const reports = await api('GET', '/api/reports');
  const list = document.getElementById('reports-list');

  if (!reports.length) {
    list.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:0.85rem">No reports yet.</div>';
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
    el.classList.toggle('active', el.dataset.id === id)
  );
  try {
    const { content } = await api('GET', `/api/reports/${encodeURIComponent(id)}`);
    setText('report-title', id);
    setHtml('report-content', marked.parse(content));
    document.getElementById('report-content').className = 'markdown-body';
    document.getElementById('report-content').scrollTop = 0;
  } catch {
    setText('report-content', 'Could not load report.');
  }
}

/* ── Profile ───────────────────────────────────────────────────────────────── */
async function loadProfile() {
  const [cvRes, configRes, mdRes] = await Promise.all([
    api('GET', '/api/cv'),
    api('GET', '/api/profile-config'),
    api('GET', '/api/profile-md')
  ]);
  document.getElementById('cv-editor').value = cvRes.content;
  document.getElementById('profile-config-editor').value = configRes.content;
  document.getElementById('profile-md-editor').value = mdRes.content;
}

window.saveCV = async function() {
  await api('PUT', '/api/cv', { content: document.getElementById('cv-editor').value });
  showToast('CV saved');
};
window.saveProfileConfig = async function() {
  await api('PUT', '/api/profile-config', { content: document.getElementById('profile-config-editor').value });
  showToast('Profile config saved');
};
window.saveProfileMd = async function() {
  await api('PUT', '/api/profile-md', { content: document.getElementById('profile-md-editor').value });
  showToast('Archetype preferences saved');
};

/* ── Profile sub-tabs ──────────────────────────────────────────────────────── */
document.querySelectorAll('.ptab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.ptab-panel').forEach(p => {
      p.classList.toggle('active', p.id === btn.dataset.ptab);
    });
  });
});

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Init ──────────────────────────────────────────────────────────────────── */
(async function init() {
  // All screens hidden by default via CSS; show auth first
  showScreen('auth-screen');
  try {
    currentUser = await api('GET', '/auth/me');
    await afterLogin();
  } catch {
    showScreen('auth-screen');
  }
})();
