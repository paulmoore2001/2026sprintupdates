// ============================================================
// Start Garden — 60 Day Sprint Update
// Shared logic for the roster page and individual founder pages.
// Data source: founders.json (generated once from the Top 50
// Sprint Statements spreadsheet — see README.md to regenerate).
// Submissions post to a Google Apps Script Web App, which
// appends a row to a Google Sheet. See Code.gs + README.md.
// ============================================================

async function loadFounders() {
  const res = await fetch('founders.json');
  if (!res.ok) throw new Error('Could not load founders.json');
  return res.json();
}

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------------- Roster page (index.html) ----------------

async function initRoster() {
  const listEl = document.getElementById('roster-list');
  const countEl = document.getElementById('roster-count');
  const searchEl = document.getElementById('roster-search');
  if (!listEl) return;

  let founders = [];
  try {
    founders = await loadFounders();
  } catch (err) {
    listEl.innerHTML = '<li class="loading-line">Could not load the founder roster. Refresh to try again.</li>';
    return;
  }

  function render(list) {
    listEl.innerHTML = '';
    list.forEach(f => {
      const li = document.createElement('li');
      li.className = 'roster-row';
      li.innerHTML = `
        <a href="founder.html?id=${encodeURIComponent(f.slug)}">
          <span class="roster-names">
            <span class="roster-founder">${escapeHtml(f.founderName)}</span><br>
            <span class="roster-company">${escapeHtml(f.companyName)}</span>
          </span>
          <span class="roster-go" aria-hidden="true">&#8594;</span>
        </a>`;
      listEl.appendChild(li);
    });
    countEl.textContent = `${list.length} of ${founders.length}`;
  }

  render(founders);

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    const filtered = !q ? founders : founders.filter(f =>
      f.founderName.toLowerCase().includes(q) ||
      f.companyName.toLowerCase().includes(q)
    );
    render(filtered);
  });
}

// ---------------- Founder page (founder.html) ----------------

async function initFounderPage() {
  const slug = qs('id');
  const root = document.getElementById('page-root');
  if (!root) return;

  let founders = [];
  try {
    founders = await loadFounders();
  } catch (err) {
    root.innerHTML = '<div class="loading-line">Could not load sprint data. Refresh to try again.</div>';
    return;
  }

  const founder = founders.find(f => f.slug === slug);

  if (!founder) {
    document.getElementById('loading-state').style.display = 'none';
    const nf = document.getElementById('not-found-state');
    nf.style.display = 'block';
    return;
  }

  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('found-state').style.display = 'block';

  document.title = `${founder.founderName} — 60 Day Sprint Update`;
  document.getElementById('founder-name').textContent = founder.founderName;
  document.getElementById('company-name').textContent = founder.companyName;
  document.getElementById('milestone-quote').textContent = founder.milestone || 'No milestone on file.';
  document.getElementById('metrics-quote').textContent = founder.metrics || 'No stated metrics on file.';

  wireCharCount('milestone-update', 'milestone-count');
  wireCharCount('metrics-update', 'metrics-count');

  const form = document.getElementById('sprint-form');
  const errorEl = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.dataset.visible = 'false';

    const milestoneUpdate = document.getElementById('milestone-update').value.trim();
    const metricsUpdate = document.getElementById('metrics-update').value.trim();
    const statusInput = form.querySelector('input[name="sprint-status"]:checked');

    if (!milestoneUpdate || !metricsUpdate) {
      errorEl.textContent = 'Add an update for both the milestone and the metrics before submitting.';
      errorEl.dataset.visible = 'true';
      return;
    }
    if (!statusInput) {
      errorEl.textContent = 'Choose how you\u2019d describe your sprint.';
      errorEl.dataset.visible = 'true';
      return;
    }

    const payload = {
      slug: founder.slug,
      founderName: founder.founderName,
      companyName: founder.companyName,
      milestoneOriginal: founder.milestone,
      metricsOriginal: founder.metrics,
      milestoneUpdate,
      metricsUpdate,
      sprintStatus: statusInput.value,
      submittedAt: new Date().toISOString()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting\u2026';

    try {
      if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.startsWith('PASTE_')) {
        throw new Error('not-configured');
      }
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids a CORS preflight against Apps Script
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.status !== 'ok') {
        throw new Error('bad-response');
      }
      form.dataset.submitted = 'true';
      document.getElementById('confirm-state').dataset.visible = 'true';
      document.getElementById('confirm-name').textContent = founder.founderName;
    } catch (err) {
      errorEl.textContent = err.message === 'not-configured'
        ? 'This form isn\u2019t connected to a spreadsheet yet. (Admin: paste the Apps Script URL into config.js.)'
        : 'Something went wrong sending your update. Please try again.';
      errorEl.dataset.visible = 'true';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit update';
    }
  });
}

function wireCharCount(fieldId, countId) {
  const field = document.getElementById(fieldId);
  const count = document.getElementById(countId);
  const limit = parseInt(field.getAttribute('maxlength'), 10) || 300;
  const update = () => {
    const remaining = limit - field.value.length;
    count.textContent = `${field.value.length} / ${limit}`;
    count.dataset.over = remaining < 0 ? 'true' : 'false';
  };
  field.addEventListener('input', update);
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  initRoster();
  initFounderPage();
});
