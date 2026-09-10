// ============================================================
// Start Garden — 60 Day Sprint Update
// Shared logic for individual founder pages.
// Data source: data/<slug>.json — one small file per founder,
// generated once from the Top 50 Sprint Statements spreadsheet
// (see README.md to regenerate). Each founder page loads only
// its own file, never the other 49 founders' data.
// Submissions post to a Google Apps Script Web App, which
// appends a row to a Google Sheet. See Code.gs + README.md.
// ============================================================

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

// ---------------- Founder page (founder.html) ----------------

async function initFounderPage() {
  const slug = qs('id');
  const root = document.getElementById('page-root');
  if (!root) return;

  // Guard against a stray slug value that isn't a safe filename.
  const safeSlug = /^[a-z0-9-]+$/.test(slug || '') ? slug : null;

  let founder = null;
  if (safeSlug) {
    try {
      const res = await fetch(`data/${safeSlug}.json`);
      if (res.ok) founder = await res.json();
    } catch (err) {
      // fall through to not-found below
    }
  }

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
  initFounderPage();
});
