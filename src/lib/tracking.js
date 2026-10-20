import { base44 } from '@/api/base44Client';

const VISITOR_KEY = 'poles-agri-visitor';
const SOURCES = ['direct', 'email', 'reseaux', 'recherche', 'qr', 'autre'];

export function getVisitorId() {
  let id = null;
  try {
    id = localStorage.getItem(VISITOR_KEY);
  } catch (error) {
    id = null;
  }
  if (!id) {
    id = `v${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    try {
      localStorage.setItem(VISITOR_KEY, id);
    } catch (error) {
      // stockage indisponible : la mesure reste anonyme et sans mémoire
    }
  }
  return id;
}

export function detectDevice() {
  const agent = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(agent)) return 'tablette';
  if (/Mobi|Android|iPhone/i.test(agent)) return 'mobile';
  return window.innerWidth < 900 ? 'tablette' : 'ordinateur';
}

export function detectSource(search = '') {
  const explicit = (new URLSearchParams(search).get('src') || '').toLowerCase();
  if (SOURCES.includes(explicit)) return explicit;
  const referrer = (document.referrer || '').toLowerCase();
  if (!referrer) return 'direct';
  if (/mail|outlook|gmail|yahoo|laposte/.test(referrer)) return 'email';
  if (/google|bing|duckduckgo|qwant|ecosia|yahoo/.test(referrer)) return 'recherche';
  if (/facebook|linkedin|instagram|twitter|x\.com|tiktok|whatsapp/.test(referrer)) return 'reseaux';
  return 'autre';
}

export async function trackEvent({ catalogue, type, pageNumber = 0 }) {
  if (!catalogue?.id) return null;
  return base44.entities.CatalogueEvent.create({
    catalogue_id: catalogue.id,
    pole_id: catalogue.pole_id || '',
    version_id: catalogue.active_version_id || '',
    type,
    page_number: type === 'page' || type === 'full_read' ? pageNumber : 0,
    visitor_id: getVisitorId(),
    source: detectSource(window.location.search),
    device: detectDevice(),
    referrer: (document.referrer || '').slice(0, 250),
  });
}