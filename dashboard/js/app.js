const DEVELOPERS = [
  { id: 'RoberRaf', name: 'Rober Raf', color: '#4A90D9' },
  { id: 'AhmadDev', name: 'Ahmad Dev', color: '#7B68EE' },
  { id: 'SaraQA', name: 'Sara QA', color: '#E91E63' },
  { id: 'OmarDesign', name: 'Omar Design', color: '#FF9800' },
  { id: 'LinaFront', name: 'Lina Front', color: '#4CAF50' }
];

const TASKS_CONFIG = {
  mode: 'tasks',
  apiBase: '/api/tasks',
  columns: [
    { id: 'todo', label: 'Todo', color: '#9E9E9E' },
    { id: 'in-progress', label: 'In Progress', color: '#2196F3' },
    { id: 'done', label: 'Done', color: '#4CAF50' },
    { id: 'blocked', label: 'Blocked', color: '#F44336' }
  ],
  cardFields: ['title', 'status', 'claimed_by', 'filename'],
  statusKey: 'status'
};

const CYCLES_CONFIG = {
  mode: 'cycles',
  apiBase: '/api/cycles',
  columns: [
    { id: 'proposed', label: 'Proposed', color: '#9E9E9E' },
    { id: 'g1-committed', label: 'G1 Committed', color: '#2196F3' },
    { id: 'running', label: 'Running', color: '#3F51B5' },
    { id: 'g2-pulse', label: 'G2 Pulse', color: '#FFC107' },
    { id: 'g3-resolve', label: 'G3 Resolve', color: '#FF9800' },
    { id: 'killed', label: 'Killed', color: '#F44336' },
    { id: 'done', label: 'Done', color: '#4CAF50' }
  ],
  statusKey: 'status'
};

let activeConfig = TASKS_CONFIG;
let activeAssigneeFilter = null; // null = show all, dev id string = filter
let activeSearchQuery = '';
let searchDebounceTimer = null;

function loadBoard() {
  renderBoard('board-container', activeConfig, DEVELOPERS, activeAssigneeFilter, activeSearchQuery);
}

function initAssigneeFilter() {
  const select = document.getElementById('assignee-filter');
  select.innerHTML = '';

  const allOpt = new Option('All', '');
  select.appendChild(allOpt);

  const unassignedOpt = new Option('Unassigned', '__unassigned__');
  select.appendChild(unassignedOpt);

  DEVELOPERS.forEach(dev => {
    select.appendChild(new Option(dev.name, dev.id));
  });

  select.addEventListener('change', () => {
    activeAssigneeFilter = select.value || null;
    loadBoard();
  });
}

function resetAssigneeFilter() {
  activeAssigneeFilter = null;
  document.getElementById('assignee-filter').value = '';
}

function switchTab(mode) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'tasks') {
    activeConfig = TASKS_CONFIG;
  } else if (mode === 'cycles') {
    activeConfig = CYCLES_CONFIG;
  }
  resetAssigneeFilter();
  activeSearchQuery = '';
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  searchInput.placeholder = mode === 'cycles' ? 'Search cycles\u2026' : 'Search tasks\u2026';
  loadBoard();
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type || 'info'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- Git Pull ---
async function handlePull() {
  const btn = document.getElementById('pull-btn');
  btn.disabled = true;
  btn.textContent = 'Pulling…';
  try {
    const res = await fetch('/api/git/pull', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.output || 'Pull successful', 'info');
      loadBoard();
    } else {
      showToast('Pull failed: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showToast('Pull failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Pull';
  }
}

// --- Git Push (with commit dialog) ---
function showPushDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'push-overlay';
  overlay.innerHTML = `
    <div class="push-dialog">
      <h3>Commit &amp; Push</h3>
      <textarea id="commit-msg" placeholder="Enter commit message…"></textarea>
      <div class="push-dialog-actions">
        <button class="push-cancel-btn" id="push-cancel">Cancel</button>
        <button class="push-submit-btn" id="push-submit">Commit &amp; Push</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const textarea = document.getElementById('commit-msg');
  const submitBtn = document.getElementById('push-submit');
  const cancelBtn = document.getElementById('push-cancel');

  textarea.focus();

  function close() { overlay.remove(); }

  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });

  submitBtn.addEventListener('click', async () => {
    const message = textarea.value.trim();
    if (!message) {
      textarea.classList.add('input-error');
      textarea.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Pushing…';
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pushed successfully', 'info');
        close();
      } else {
        showToast('Push failed: ' + (data.error || 'Unknown error'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Commit & Push';
      }
    } catch (err) {
      showToast('Push failed: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Commit & Push';
    }
  });

  textarea.addEventListener('input', () => {
    textarea.classList.remove('input-error');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.mode));
  });
  document.getElementById('refresh-btn').addEventListener('click', loadBoard);
  document.getElementById('pull-btn').addEventListener('click', handlePull);
  document.getElementById('push-btn').addEventListener('click', showPushDialog);
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      activeSearchQuery = e.target.value.trim().toLowerCase();
      loadBoard();
    }, 300);
  });
  initAssigneeFilter();
  loadBoard();
});
