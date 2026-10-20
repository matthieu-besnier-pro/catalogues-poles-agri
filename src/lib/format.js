export function slugify(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function uniqueSlug(base) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugify(base) || 'catalogue'}-${suffix}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function publicPath(slug, suffix = '') {
  return `/c/${slug}${suffix}`;
}

export function absoluteUrl(path) {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export function iframeCode(slug) {
  return `<iframe src="${absoluteUrl(publicPath(slug, '/embed'))}" width="100%" height="760" style="border:0" loading="lazy" allowfullscreen title="Catalogue"></iframe>`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
}

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function toCsv(rows, headers) {
  if (!rows.length) return '';
  const keys = headers || Object.keys(rows[0]);
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [keys.join(';'), ...rows.map((row) => keys.map((key) => cell(row[key])).join(';'))].join('\n');
}

export function downloadText(content, filename, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([`\uFEFF${content}`], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Les coordonnées des liens sont enregistrées sur la page entière : on les ramène
// sur la zone réellement affichée lorsque le PDF a été rogné.
export function mapLinkToCrop(link, crop) {
  const inset = crop || {};
  const widthRatio = 1 - (inset.left || 0) - (inset.right || 0);
  const heightRatio = 1 - (inset.top || 0) - (inset.bottom || 0);
  if (widthRatio <= 0 || heightRatio <= 0) return { x: link.x, y: link.y, w: link.w, h: link.h };
  return {
    x: Math.max(0, (link.x - (inset.left || 0)) / widthRatio),
    y: Math.max(0, (link.y - (inset.top || 0)) / heightRatio),
    w: Math.min(1, link.w / widthRatio),
    h: Math.min(1, link.h / heightRatio),
  };
}