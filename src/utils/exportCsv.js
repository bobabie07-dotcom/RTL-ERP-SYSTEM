export function exportCsv(rows, columns, filename = 'export.csv') {
  const cols = columns.filter(c => c.key !== 'actions' && c.key !== '_actions');
  const header = cols.map(c => esc(c.header || c.key)).join(',');
  const body   = rows.map(row => cols.map(c => esc(row[c.key] ?? '')).join(','));
  const csv    = [header, ...body].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function esc(val) {
  const s = String(val ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
