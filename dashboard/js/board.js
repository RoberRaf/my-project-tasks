function renderBoard(containerId, config, developers, assigneeFilter, searchQuery) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  fetchItems(config.apiBase).then(items => {
    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No ${config.mode} yet</div>`;
      return;
    }

    // Apply assignee filter
    if (assigneeFilter === '__unassigned__') {
      items = items.filter(item => !item.claimed_by);
    } else if (assigneeFilter) {
      items = items.filter(item => item.claimed_by === assigneeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      items = items.filter(item => {
        const fields = [
          item.title, item.body, item.filename, item.claimed_by,
          item.status, item.killCondition, item.targetMetric
        ];
        return fields.some(f => f && f.toLowerCase().includes(searchQuery));
      });
    }

    const columnMap = {};
    config.columns.forEach(col => {
      columnMap[col.id] = [];
    });

    items.forEach(item => {
      const status = item[config.statusKey] || config.columns[0].id;
      if (columnMap[status]) {
        columnMap[status].push(item);
      } else {
        columnMap[config.columns[0].id].push(item);
      }
    });

    config.columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'board-column';
      colEl.dataset.columnId = col.id;

      const header = document.createElement('div');
      header.className = 'column-header';
      header.style.borderTopColor = col.color;
      header.innerHTML = `
        <span class="column-label">${col.label}</span>
        <span class="column-count" style="background:${col.color}">${columnMap[col.id].length}</span>
      `;

      const body = document.createElement('div');
      body.className = 'column-body';

      columnMap[col.id].forEach(item => {
        body.appendChild(createCard(item, col, config, developers));
      });

      setupDropZone(body, col, config);

      colEl.appendChild(header);
      colEl.appendChild(body);
      container.appendChild(colEl);
    });
  });
}

function createCard(item, column, config, developers) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = !window.DASHBOARD_READONLY;
  card.dataset.filename = item.filename;
  card.style.borderLeftColor = column.color;

  const isCycle = config.mode === 'cycles';

  // Mode badge (cycles only)
  if (isCycle) {
    const mode = item.mode || 'OUTCOME';
    const modeBadge = document.createElement('span');
    modeBadge.className = 'mode-badge';
    modeBadge.classList.add(mode === 'DISCOVERY' ? 'mode-discovery' : 'mode-outcome');
    modeBadge.textContent = mode;
    card.appendChild(modeBadge);
  }

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = item.title;
  card.appendChild(title);

  if (!isCycle) {
    const chip = document.createElement('span');
    chip.className = 'status-chip';
    chip.style.background = column.color;
    chip.textContent = column.label;
    card.appendChild(chip);
  }

  // Kill condition & target metric (cycles only)
  if (isCycle) {
    if (item.killCondition) {
      const killEl = document.createElement('div');
      killEl.className = 'card-meta';
      killEl.innerHTML = `<span class="meta-label">Kill:</span> ${escapeHtml(item.killCondition)}`;
      card.appendChild(killEl);
    } else {
      const killEl = document.createElement('div');
      killEl.className = 'card-meta card-meta-empty';
      killEl.textContent = 'No kill condition';
      card.appendChild(killEl);
    }
    if (item.targetMetric) {
      const metricEl = document.createElement('div');
      metricEl.className = 'card-meta';
      metricEl.innerHTML = `<span class="meta-label">Metric:</span> ${escapeHtml(item.targetMetric)}`;
      card.appendChild(metricEl);
    }
    // Separator before assignee
    const sep = document.createElement('hr');
    sep.className = 'card-sep';
    card.appendChild(sep);
  }

  const assigneeRow = document.createElement('div');
  assigneeRow.className = 'card-assignee';
  assigneeRow.style.position = 'relative';

  const dev = developers.find(d => d.id === item.claimed_by);
  if (dev) {
    let tempoHtml = '';
    if (isCycle && item.claimed_at) {
      const days = Math.floor((Date.now() - new Date(item.claimed_at).getTime()) / 86400000);
      tempoHtml = `<span class="tempo">${days}d elapsed</span>`;
    }
    assigneeRow.innerHTML = `
      <span class="avatar" style="background:${dev.color}">${dev.name[0]}</span>
      <span>${dev.name}</span>
      ${tempoHtml}
    `;
  } else {
    assigneeRow.innerHTML = `<span class="unassigned">Unassigned</span>`;
  }

  if (!window.DASHBOARD_READONLY) {
    assigneeRow.addEventListener('click', (e) => {
      e.stopPropagation();
      showAssignDropdown(assigneeRow, item, config, developers);
    });
  }

  const fileRef = document.createElement('div');
  fileRef.className = 'card-file';
  fileRef.textContent = item.filename;

  card.appendChild(assigneeRow);
  card.appendChild(fileRef);

  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-assignee') || e.target.closest('.assign-dropdown')) return;
    showDetailDialog(item, config, developers);
  });

  if (!window.DASHBOARD_READONLY) {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.filename);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  }

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setupDropZone(columnBody, column, config) {
  if (window.DASHBOARD_READONLY) return;
  columnBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    columnBody.classList.add('drag-over');
  });
  columnBody.addEventListener('dragleave', () => {
    columnBody.classList.remove('drag-over');
  });
  columnBody.addEventListener('drop', (e) => {
    e.preventDefault();
    columnBody.classList.remove('drag-over');

    const filename = e.dataTransfer.getData('text/plain');
    const card = document.querySelector(`.card[data-filename="${CSS.escape(filename)}"]`);
    if (!card) return;

    const sourceColumn = card.closest('.column-body');
    if (sourceColumn === columnBody) return;

    // Optimistic move
    columnBody.appendChild(card);
    card.style.borderLeftColor = column.color;
    const chip = card.querySelector('.status-chip');
    if (chip) {
      chip.style.background = column.color;
      chip.textContent = column.label;
    }
    updateCounts();

    patchItem(config.apiBase, filename, { [config.statusKey]: column.id }).catch(err => {
      // Revert
      sourceColumn.appendChild(card);
      updateCounts();
      showToast('Failed to update status: ' + err.message, 'error');
    });
  });
}

function showAssignDropdown(container, item, config, developers) {
  // Close any existing dropdown
  document.querySelectorAll('.assign-dropdown').forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'assign-dropdown';

  const unassignOpt = document.createElement('div');
  unassignOpt.className = 'assign-option';
  unassignOpt.textContent = 'Unassign';
  unassignOpt.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.remove();
    updateAssigneeUI(container, null, developers);
    patchItem(config.apiBase, item.filename, { claimed_by: '', claimed_at: '' }).catch(err => {
      showToast('Failed to unassign: ' + err.message, 'error');
    });
  });
  dropdown.appendChild(unassignOpt);

  developers.forEach(dev => {
    const opt = document.createElement('div');
    opt.className = 'assign-option';
    opt.innerHTML = `<span class="avatar" style="background:${dev.color}">${dev.name[0]}</span> ${dev.name}`;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.remove();
      item.claimed_by = dev.id;
      updateAssigneeUI(container, dev, developers);
      patchItem(config.apiBase, item.filename, {
        claimed_by: dev.id,
        claimed_at: new Date().toISOString()
      }).catch(err => {
        showToast('Failed to assign: ' + err.message, 'error');
      });
    });
    dropdown.appendChild(opt);
  });

  container.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener('click', function close() {
      dropdown.remove();
      document.removeEventListener('click', close);
    }, { once: true });
  }, 0);
}

function updateAssigneeUI(container, dev) {
  if (dev) {
    container.innerHTML = `
      <span class="avatar" style="background:${dev.color}">${dev.name[0]}</span>
      <span>${dev.name}</span>
    `;
  } else {
    container.innerHTML = `<span class="unassigned">Unassigned</span>`;
  }
}

function updateCounts() {
  document.querySelectorAll('.board-column').forEach(col => {
    const count = col.querySelector('.column-body').children.length;
    col.querySelector('.column-count').textContent = count;
  });
}

function showDetailDialog(item, config, developers) {
  // Remove any existing dialog
  document.querySelectorAll('.detail-overlay').forEach(d => d.remove());

  const isCycle = config.mode === 'cycles';
  const col = config.columns.find(c => c.id === item[config.statusKey]) || config.columns[0];
  const dev = developers.find(d => d.id === item.claimed_by);

  const overlay = document.createElement('div');
  overlay.className = 'detail-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'detail-dialog';

  // Header
  const header = document.createElement('div');
  header.className = 'detail-header';
  header.innerHTML = `
    <h2 class="detail-title">${escapeHtml(item.title)}</h2>
    <button class="detail-close">&times;</button>
  `;
  dialog.appendChild(header);

  // Meta section
  const meta = document.createElement('div');
  meta.className = 'detail-meta';

  // Status row
  meta.innerHTML += `
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="status-chip" style="background:${col.color}">${col.label}</span>
    </div>
  `;

  // Mode (cycles only)
  if (isCycle) {
    const mode = item.mode || 'OUTCOME';
    meta.innerHTML += `
      <div class="detail-row">
        <span class="detail-label">Mode</span>
        <span class="mode-badge ${mode === 'DISCOVERY' ? 'mode-discovery' : 'mode-outcome'}">${mode}</span>
      </div>
    `;
  }

  // Filename
  meta.innerHTML += `
    <div class="detail-row">
      <span class="detail-label">File</span>
      <span class="card-file">${escapeHtml(item.filename)}</span>
    </div>
  `;

  // Kill condition & metric (cycles)
  if (isCycle) {
    if (item.killCondition) {
      meta.innerHTML += `
        <div class="detail-row">
          <span class="detail-label">Kill Condition</span>
          <span>${escapeHtml(item.killCondition)}</span>
        </div>
      `;
    }
    if (item.targetMetric) {
      meta.innerHTML += `
        <div class="detail-row">
          <span class="detail-label">Target Metric</span>
          <span>${escapeHtml(item.targetMetric)}</span>
        </div>
      `;
    }
  }

  // Claimed at (if set)
  if (item.claimed_at) {
    const date = new Date(item.claimed_at);
    meta.innerHTML += `
      <div class="detail-row">
        <span class="detail-label">Claimed At</span>
        <span>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
      </div>
    `;
  }

  dialog.appendChild(meta);

  // Assignee row (editable)
  const assigneeSection = document.createElement('div');
  assigneeSection.className = 'detail-assignee-section';
  assigneeSection.innerHTML = `<span class="detail-label">Assignee</span>`;

  const assigneeControl = document.createElement('div');
  assigneeControl.className = 'detail-assignee-control';
  assigneeControl.style.position = 'relative';

  const editHint = window.DASHBOARD_READONLY ? '' : '<span class="detail-edit-hint">click to change</span>';
  const assignHint = window.DASHBOARD_READONLY ? '' : '<span class="detail-edit-hint">click to assign</span>';

  if (dev) {
    assigneeControl.innerHTML = `
      <span class="avatar" style="background:${dev.color}">${dev.name[0]}</span>
      <span>${dev.name}</span>
      ${editHint}
    `;
  } else {
    assigneeControl.innerHTML = `
      <span class="unassigned">Unassigned</span>
      ${assignHint}
    `;
  }

  if (!window.DASHBOARD_READONLY) {
    assigneeControl.addEventListener('click', (e) => {
      e.stopPropagation();
      showAssignDropdown(assigneeControl, item, config, developers);
    });
  }

  assigneeSection.appendChild(assigneeControl);
  dialog.appendChild(assigneeSection);

  // History button
  const historyLines = extractHistory(item.body);
  if (historyLines.length > 0) {
    const historyBtn = document.createElement('button');
    historyBtn.className = 'history-btn';
    historyBtn.textContent = `View History (${historyLines.length})`;
    historyBtn.addEventListener('click', () => showHistoryDialog(item.title, historyLines));
    dialog.appendChild(historyBtn);
  }

  // Body content (rendered as markdown)
  if (item.body && item.body.trim()) {
    const bodySection = document.createElement('div');
    bodySection.className = 'detail-body';
    const renderedHtml = typeof marked !== 'undefined'
      ? marked.parse(item.body.trim())
      : `<pre>${escapeHtml(item.body.trim())}</pre>`;
    bodySection.innerHTML = `
      <div class="detail-label" style="margin-bottom:8px">Details</div>
      <div class="detail-body-content">${renderedHtml}</div>
    `;
    dialog.appendChild(bodySection);
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Close handlers
  const closeDialog = () => overlay.remove();
  header.querySelector('.detail-close').addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', onEsc);
    }
  });
}

function extractHistory(body) {
  if (!body) return [];
  const historyMatch = body.match(/## History\r?\n([\s\S]*?)(?:\n##\s|$)/);
  if (!historyMatch) return [];
  return historyMatch[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '));
}

function showHistoryDialog(title, historyLines) {
  document.querySelectorAll('.history-overlay').forEach(d => d.remove());

  const overlay = document.createElement('div');
  overlay.className = 'history-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'history-dialog';

  const entriesHtml = historyLines.map(line => {
    const text = line.replace(/^- /, '');
    const rendered = typeof marked !== 'undefined'
      ? marked.parseInline(text)
      : escapeHtml(text);
    return `<li class="history-entry">${rendered}</li>`;
  }).join('');

  dialog.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-title">History</h2>
      <button class="detail-close">&times;</button>
    </div>
    <div class="history-subtitle">${escapeHtml(title)}</div>
    <ul class="history-list">${entriesHtml}</ul>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const closeHistory = () => overlay.remove();
  dialog.querySelector('.detail-close').addEventListener('click', closeHistory);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeHistory();
  });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      closeHistory();
      document.removeEventListener('keydown', onEsc);
    }
  });
}
