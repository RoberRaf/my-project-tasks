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
    { id: 'Proposed', label: 'Proposed', color: '#9E9E9E' },
    { id: 'G1 Committed', label: 'G1 Committed', color: '#2196F3' },
    { id: 'Running', label: 'Running', color: '#3F51B5' },
    { id: 'G2 Pulse', label: 'G2 Pulse', color: '#FFC107' },
    { id: 'G3 Resolve', label: 'G3 Resolve', color: '#FF9800' },
    { id: 'Killed', label: 'Killed', color: '#F44336' },
    { id: 'Done', label: 'Done', color: '#4CAF50' }
  ],
  statusKey: 'status'
};

let activeConfig = TASKS_CONFIG;

function loadBoard() {
  renderBoard('board-container', activeConfig, DEVELOPERS);
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
  loadBoard();
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type || 'info'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.mode));
  });
  document.getElementById('refresh-btn').addEventListener('click', loadBoard);
  loadBoard();
});
