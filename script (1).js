/* ── Storage ── */
const STORAGE_KEY = 'rennie_library_repository';
const repository = [];

/* ── DOM References ── */
const frontPage            = document.getElementById('frontPage');
const dashboardPage        = document.getElementById('dashboardPage');
const enterBtn             = document.getElementById('enterBtn');
const backBtn              = document.getElementById('backBtn');
const fileInput            = document.getElementById('fileInput');
const uploadButton         = document.getElementById('uploadButton');
const toast                = document.getElementById('toast');
const statusBanner         = document.getElementById('statusBanner');
const statusMessage        = document.getElementById('statusMessage');
const progressBar          = document.getElementById('progressBar');
const progressFill         = document.getElementById('progressFill');
const repositoryList       = document.getElementById('repositoryList');
const searchInput          = document.getElementById('searchInput');
const sortSelect           = document.getElementById('sortSelect');
const selectAllButton      = document.getElementById('selectAllButton');
const downloadSelectedBtn  = document.getElementById('downloadSelectedButton');
const downloadAllBtn       = document.getElementById('downloadAllButton');
const deleteSelectedBtn    = document.getElementById('deleteSelectedButton');
const clearAllBtn          = document.getElementById('clearAllButton');
const selectedCount        = document.getElementById('selectedCount');
const selectionBadge       = document.getElementById('selectionBadge');

/* ── Navigation ── */
enterBtn.addEventListener('click', () => {
  frontPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
  loadRepository();
  renderRepository();
});

backBtn.addEventListener('click', () => {
  dashboardPage.classList.add('hidden');
  frontPage.classList.remove('hidden');
});

/* ── Persistence ── */
function saveRepository() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repository));
}

function loadRepository() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      repository.length = 0;
      repository.push(...parsed);
    }
  } catch (e) {
    console.error('Failed to load repository:', e);
  }
}

/* ── Helpers ── */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(sizeInKB) {
  const n = Number(sizeInKB);
  return n >= 1024 ? `${(n / 1024).toFixed(2)} MB` : `${n.toFixed(2)} KB`;
}

function showProgress(value) {
  progressBar.style.display = 'block';
  progressFill.style.width  = `${value}%`;
}

function hideProgress() {
  progressBar.style.display = 'none';
  progressFill.style.width  = '0%';
}

function showStatus(message) {
  statusMessage.textContent    = message;
  statusBanner.style.display   = 'block';
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => {
    statusBanner.style.display = 'none';
    statusMessage.textContent  = '';
  }, 3500);
}

function showToast(message, type = 'success') {
  toast.textContent  = message;
  toast.className    = `toast ${type} show`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function updateSelectedCount() {
  const n = repositoryList.querySelectorAll('.repository-item.selected').length;
  selectedCount.textContent  = `${n} selected`;
  selectionBadge.textContent = n ? `${n} item(s) chosen` : 'No selection';
}

function sortItems(items) {
  const mode = sortSelect.value;
  return items.slice().sort((a, b) =>
    mode === 'date' ? (b.addedAt || 0) - (a.addedAt || 0) : a.name.localeCompare(b.name)
  );
}

/* ── Render ── */
function renderRepository() {
  const query    = searchInput.value.toLowerCase();
  const filtered = sortItems(repository).filter(item =>
    item.name.toLowerCase().includes(query)
  );

  repositoryList.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.innerHTML = `
      <div class="empty-state-icon">📄</div>
      <strong>No files found</strong>
      <span>Upload a PDF or clear the search.</span>
    `;
    repositoryList.appendChild(li);
    updateSelectedCount();
    return;
  }

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.className    = 'repository-item';
    li.dataset.name = item.name;

    li.addEventListener('click', () => {
      li.classList.toggle('selected');
      updateSelectedCount();
    });

    const meta = document.createElement('div');
    meta.className = 'file-meta';

    const nameEl = document.createElement('span');
    nameEl.className   = 'file-name';
    nameEl.textContent = item.name;
    nameEl.title       = item.name;

    const sizeEl = document.createElement('span');
    sizeEl.className   = 'file-size';
    sizeEl.textContent = formatFileSize(item.size);

    meta.append(nameEl, sizeEl);

    const actions = document.createElement('div');
    actions.className  = 'item-actions';

    const dlBtn        = document.createElement('a');
    dlBtn.className    = 'download-btn';
    dlBtn.href         = item.url;
    dlBtn.download     = item.name;
    dlBtn.textContent  = 'Download';

    const rmBtn        = document.createElement('button');
    rmBtn.className    = 'remove-btn';
    rmBtn.textContent  = 'Remove';
    rmBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`Delete "${item.name}"?`)) return;
      repository.splice(repository.indexOf(item), 1);
      saveRepository();
      renderRepository();
      showToast(`${item.name} deleted`, 'warning');
    });

    actions.append(dlBtn, rmBtn);
    li.append(meta, actions);
    repositoryList.appendChild(li);
  });

  updateSelectedCount();
}

/* ── Upload ── */
uploadButton.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) { showStatus('Please choose at least one PDF file.'); return; }

  let ok = 0, fail = 0;
  showProgress(0);

  for (let i = 0; i < files.length; i++) {
    const file    = files[i];
    const pct     = Math.round(((i + 1) / files.length) * 100);
    const isPDF   = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPDF) { fail++; showProgress(pct); continue; }

    try {
      const dataUrl = await readFileAsDataURL(file);
      repository.push({ name: file.name, size: file.size / 1024, url: dataUrl, addedAt: Date.now() });
      ok++;
    } catch (e) {
      fail++;
      console.error('Failed to read file:', e);
    } finally {
      showProgress(pct);
    }
  }

  if (ok > 0) { saveRepository(); renderRepository(); }

  showStatus(`${ok} uploaded${fail ? `, ${fail} failed` : ''}`);
  showToast(`Uploaded ${ok} PDF(s)`, ok ? 'success' : 'error');
  fileInput.value = '';
  setTimeout(hideProgress, 700);
});

/* ── Search & Sort ── */
searchInput.addEventListener('input', renderRepository);
sortSelect.addEventListener('change', renderRepository);

/* ── Bulk Actions ── */
selectAllButton.addEventListener('click', () => {
  const items    = repositoryList.querySelectorAll('.repository-item');
  const selectAll = selectAllButton.textContent.trim() === 'Select All';
  items.forEach(el => el.classList.toggle('selected', selectAll));
  selectAllButton.textContent = selectAll ? 'Deselect All' : 'Select All';
  updateSelectedCount();
});

downloadSelectedBtn.addEventListener('click', () => {
  repositoryList.querySelectorAll('.repository-item.selected').forEach(el => {
    el.querySelector('.download-btn')?.click();
  });
});

downloadAllBtn.addEventListener('click', () => {
  repository.forEach(item => {
    const a    = document.createElement('a');
    a.href     = item.url;
    a.download = item.name;
    a.click();
  });
});

deleteSelectedBtn.addEventListener('click', () => {
  const selected = repositoryList.querySelectorAll('.repository-item.selected');
  if (!selected.length) return;
  if (!confirm('Delete selected files?')) return;
  selected.forEach(el => {
    const idx = repository.findIndex(f => f.name === el.dataset.name);
    if (idx !== -1) repository.splice(idx, 1);
  });
  saveRepository();
  renderRepository();
  showToast('Selected files deleted', 'warning');
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Remove all files from the repository?')) return;
  repository.length = 0;
  saveRepository();
  renderRepository();
  showToast('All files removed', 'warning');
});
