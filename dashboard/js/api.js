window.DASHBOARD_READONLY = false;

async function fetchItems(apiBase) {
  try {
    const res = await fetch(apiBase);
    if (!res.ok) throw new Error(`GET ${apiBase} failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    // Fallback to static JSON (GitHub Pages / any static host)
    const staticMap = {
      '/api/tasks': './data/tasks.json',
      '/api/cycles': './data/cycles.json'
    };
    const staticUrl = staticMap[apiBase];
    if (staticUrl) {
      try {
        const res2 = await fetch(staticUrl);
        if (res2.ok) {
          window.DASHBOARD_READONLY = true;
          document.body.classList.add('readonly');
          return await res2.json();
        }
      } catch (e) { /* both failed */ }
    }
    console.error(err);
    return [];
  }
}

async function patchItem(apiBase, filename, fields) {
  if (window.DASHBOARD_READONLY) {
    showToast('View-only mode — changes disabled', 'error');
    return;
  }
  const res = await fetch(`${apiBase}/${encodeURIComponent(filename)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `PATCH failed: ${res.status}`);
  }
  return res.json();
}
