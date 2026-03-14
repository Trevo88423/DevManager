const tableBody = document.getElementById('table-body');
const portCount = document.getElementById('port-count');
const lastScan = document.getElementById('last-scan');
const filterInput = document.getElementById('filter');
const autoRefreshSelect = document.getElementById('auto-refresh');
const btnRefresh = document.getElementById('btn-refresh');
const killDialog = document.getElementById('kill-dialog');
const killDialogMsg = document.getElementById('kill-dialog-msg');
const killConfirm = document.getElementById('kill-confirm');
const killCancel = document.getElementById('kill-cancel');
const btnDevFilter = document.getElementById('btn-dev-filter');
const btnCompact = document.getElementById('btn-compact');

let currentData = [];
let sortColumn = 'port';
let sortDirection = 'asc';
let pendingKillPid = null;
let devFilterActive = false;
let compactMode = false;

const DEV_PATTERNS = [
  'vite', 'next', 'webpack', 'react-scripts', 'angular', 'ng serve',
  'nuxt', 'remix', 'astro', 'svelte', 'turbopack', 'parcel',
  'nodemon', 'ts-node', 'tsx', 'express', 'fastify', 'nest',
  'dev', 'serve',
];

// --- Scanning ---

async function doScan() {
  const result = await window.api.scan();
  handleScanResult(result);
}

function handleScanResult(result) {
  if (!result.success) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Error: ${escapeHtml(result.error)}</td></tr>`;
    return;
  }

  currentData = result.data;
  renderTable();

  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour12: false });
  lastScan.textContent = `Last scan: ${time}`;
}

// --- Rendering ---

function renderTable() {
  const filtered = applyFilter(currentData);
  const sorted = applySort(filtered);

  portCount.textContent = `${sorted.length} port${sorted.length !== 1 ? 's' : ''}`;

  const cols = compactMode ? 3 : 6;

  if (sorted.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty-state">${currentData.length === 0 ? 'No listening ports found' : 'No matches'}</td></tr>`;
    return;
  }

  tableBody.innerHTML = sorted.map(row => {
    const isSystem = row.pid === 0 || row.pid === 4;
    const isDev = isDevServer(row);
    const portClass = isDev ? 'col-mono port-dev' : 'col-mono';
    const rowClass = isDev ? ' class="row-dev"' : '';

    if (compactMode) {
      return `<tr${rowClass}>
        <td class="${portClass}">${row.port}</td>
        <td>${escapeHtml(row.processName)}</td>
        <td class="col-action">
          ${isSystem ? '' : `<button class="btn btn-kill" data-pid="${row.pid}" data-name="${escapeHtml(row.processName)}" data-port="${row.port}">Kill</button>`}
        </td>
      </tr>`;
    }

    return `<tr${rowClass}>
      <td class="${portClass}">${row.port}</td>
      <td class="col-addr">${escapeHtml(row.address)}</td>
      <td class="col-mono">${row.pid}</td>
      <td>${escapeHtml(row.processName)}</td>
      <td class="col-mono" title="${escapeHtml(row.commandLine)}">${escapeHtml(truncate(row.commandLine, 80))}</td>
      <td class="col-action">
        ${isSystem ? '' : `<button class="btn btn-kill" data-pid="${row.pid}" data-name="${escapeHtml(row.processName)}" data-port="${row.port}">Kill</button>`}
      </td>
    </tr>`;
  }).join('');
}

function isDevServer(row) {
  const cmd = row.commandLine.toLowerCase();
  const name = row.processName.toLowerCase();
  if (name !== 'node.exe' && name !== 'node' && name !== 'deno.exe' && name !== 'bun.exe') return false;
  return DEV_PATTERNS.some(p => cmd.includes(p));
}

// --- Filter ---

function applyFilter(data) {
  let filtered = data;

  if (devFilterActive) {
    filtered = filtered.filter(row => isDevServer(row));
  }

  const term = filterInput.value.toLowerCase().trim();
  if (!term) return filtered;

  return filtered.filter(row =>
    String(row.port).includes(term) ||
    String(row.pid).includes(term) ||
    row.processName.toLowerCase().includes(term) ||
    row.commandLine.toLowerCase().includes(term) ||
    row.address.toLowerCase().includes(term)
  );
}

// --- Sorting ---

function applySort(data) {
  return [...data].sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

function handleSort(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }

  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortColumn) {
      th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  renderTable();
}

// --- Kill dialog ---

function showKillDialog(pid, name, port) {
  pendingKillPid = pid;
  killDialogMsg.textContent = `Kill ${name} (PID ${pid}) on port ${port}?`;
  killDialog.classList.remove('hidden');
  killConfirm.focus();
}

function hideKillDialog() {
  killDialog.classList.add('hidden');
  pendingKillPid = null;
}

async function confirmKill() {
  if (pendingKillPid === null) return;

  const pid = pendingKillPid;
  hideKillDialog();

  const result = await window.api.kill(pid);
  if (result.success) {
    showToast(`Killed PID ${pid}`, 'success');
  } else {
    showToast(`Failed to kill PID ${pid}: ${result.error}`, 'error');
  }
  doScan();
}

// --- Event listeners ---

// Window controls
document.getElementById('win-minimize').addEventListener('click', () => window.api.windowMinimize());
document.getElementById('win-maximize').addEventListener('click', () => window.api.windowMaximize());
document.getElementById('win-close').addEventListener('click', () => window.api.windowClose());

btnRefresh.addEventListener('click', doScan);

btnDevFilter.addEventListener('click', () => {
  devFilterActive = !devFilterActive;
  btnDevFilter.classList.toggle('active', devFilterActive);
  renderTable();
});

btnCompact.addEventListener('click', () => {
  compactMode = !compactMode;
  btnCompact.classList.toggle('active', compactMode);
  document.body.classList.toggle('compact', compactMode);
  window.api.setCompact(compactMode);
  updateTableHeader();
  renderTable();
});

filterInput.addEventListener('input', renderTable);

autoRefreshSelect.addEventListener('change', () => {
  const interval = parseInt(autoRefreshSelect.value, 10);
  window.api.setAutoRefresh(interval);
});

document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => handleSort(th.dataset.sort));
});

tableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-kill');
  if (!btn) return;
  const pid = parseInt(btn.dataset.pid, 10);
  const name = btn.dataset.name;
  const port = parseInt(btn.dataset.port, 10);
  showKillDialog(pid, name, port);
});

killConfirm.addEventListener('click', confirmKill);
killCancel.addEventListener('click', hideKillDialog);

killDialog.addEventListener('click', (e) => {
  if (e.target === killDialog) hideKillDialog();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideKillDialog();
});

window.api.onScanResult(handleScanResult);

// --- Helpers ---

function updateTableHeader() {
  const thead = document.querySelector('#port-table thead tr');
  if (compactMode) {
    thead.innerHTML = `
      <th class="sortable" data-sort="port">Port <span class="sort-arrow"></span></th>
      <th class="sortable" data-sort="processName">Process <span class="sort-arrow"></span></th>
      <th class="col-action">Action</th>`;
  } else {
    thead.innerHTML = `
      <th class="sortable" data-sort="port">Port <span class="sort-arrow"></span></th>
      <th>Address</th>
      <th class="sortable" data-sort="pid">PID <span class="sort-arrow"></span></th>
      <th class="sortable" data-sort="processName">Process <span class="sort-arrow"></span></th>
      <th>Command Line</th>
      <th class="col-action">Action</th>`;
  }

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => handleSort(th.dataset.sort));
    if (th.dataset.sort === sortColumn) {
      th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Init ---

document.querySelector('th[data-sort="port"]').classList.add('sort-asc');
doScan();
window.api.windowReady();
