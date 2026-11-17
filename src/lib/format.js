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

// Guesses which filiale a dropped PDF belongs to from its file name, matching
// against each pole's own name or slug (accents/case/punctuation-insensitive
// via slugify) — e.g. "Catalogue_Gonnin-Duris_2026.pdf" matches "Gonnin Duris".
// Best-effort only: no match just leaves the usual manual picker in place.
export function detectPole(fileName, poles) {
  const haystack = slugify(fileName);
  if (!haystack) return null;
  for (const pole of poles || []) {
    const needles = [pole.slug, pole.name].filter(Boolean).map(slugify).filter((needle) => needle.length >= 3);
    if (needles.some((needle) => haystack.includes(needle))) return pole;
  }
  return null;
}

const MONTHS_FR = {
  janvier: 1,
  janv: 1,
  jan: 1,
  fevrier: 2,
  fevr: 2,
  fev: 2,
  mars: 3,
  mar: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  juil: 7,
  aout: 8,
  aou: 8,
  septembre: 9,
  sept: 9,
  sep: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  decembre: 12,
  dec: 12,
};
// Longest names first, so "avril" wins over the "avr" abbreviation on the same text.
const MONTH_PATTERN = Object.keys(MONTHS_FR)
  .sort((a, b) => b.length - a.length)
  .join('|');
const YEAR = '(19|20)\\d{2}';

function detectOperationDateFromSlug(slug) {
  if (!slug) return '';

  const byName =
    new RegExp(`(?:^|-)(${MONTH_PATTERN})-?(${YEAR})(?:-|$)`).exec(slug) ||
    new RegExp(`(?:^|-)(${YEAR})-?(${MONTH_PATTERN})(?:-|$)`).exec(slug);
  if (byName) {
    const [, first, second] = byName;
    const isYearFirst = /^\d{4}$/.test(first);
    const year = isYearFirst ? first : second;
    const month = MONTHS_FR[isYearFirst ? second : first];
    if (month) return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const numeric =
    /(?:^|-)(0[1-9]|1[0-2])-?((?:19|20)\d{2})(?:-|$)/.exec(slug) ||
    /(?:^|-)((?:19|20)\d{2})-?(0[1-9]|1[0-2])(?:-|$)/.exec(slug);
  if (numeric) {
    const [, first, second] = numeric;
    const isYearFirst = /^\d{4}$/.test(first);
    const year = isYearFirst ? first : second;
    const month = isYearFirst ? second : first;
    return `${year}-${month}-01`;
  }

  return '';
}

// Most catalogue file names carry no date at all — the operation's validity
// period is printed ON the cover itself instead ("Offre valable du 1er au 30
// avril 2026", "Catalogue avril 2026", "01/04/2026"). The cover's own
// extracted text (already pulled from the PDF for search) is a far more
// reliable signal than the file name, so it's tried first.
export function detectOperationDateFromText(text) {
  if (!text) return '';
  const normalized = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const byName = new RegExp(`\\b(${MONTH_PATTERN})\\.?\\b[^\\d]{0,12}(${YEAR})\\b`).exec(normalized);
  if (byName) {
    const month = MONTHS_FR[byName[1]];
    if (month) return `${byName[2]}-${String(month).padStart(2, '0')}-01`;
  }

  // DD/MM/YYYY (or -, . separators) — the day is discarded, only the month matters here.
  const full = /\b([0-2]?\d|3[01])[/\-.]([01]?\d)[/\-.](20\d{2})\b/.exec(normalized);
  if (full) {
    const month = Number(full[2]);
    if (month >= 1 && month <= 12) return `${full[3]}-${String(month).padStart(2, '0')}-01`;
  }

  // MM/YYYY.
  const short = /\b(0?[1-9]|1[0-2])[/\-](20\d{2})\b/.exec(normalized);
  if (short) return `${short[2]}-${short[1].padStart(2, '0')}-01`;

  return '';
}

// Guesses a catalogue's "operation" month — the commercial period it covers,
// for sorting by that rather than upload date. Tries the cover page's own
// text first (what's actually printed on it), falling back to the file name
// ("Promo_Avril2026.pdf", "Catalogue-04-2026.pdf") when that finds nothing.
// Best-effort throughout: a bare year with no month attached is too
// ambiguous and is left undetected.
export function detectOperationDate(fileName, coverText) {
  const fromText = detectOperationDateFromText(coverText);
  if (fromText) return fromText;
  return detectOperationDateFromSlug(slugify(fileName));
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