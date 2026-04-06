async function fetchItems(apiBase) {
  try {
    const res = await fetch(apiBase);
    if (!res.ok) throw new Error(`GET ${apiBase} failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function patchItem(apiBase, filename, fields) {
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
