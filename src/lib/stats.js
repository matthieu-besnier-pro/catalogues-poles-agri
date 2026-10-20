import { base44 } from '@/api/base44Client';

const DAY = 24 * 60 * 60 * 1000;

export function periodQuery(days) {
  if (!days) return {};
  return { created_date: { $gte: new Date(Date.now() - days * DAY).toISOString() } };
}

export function buildQuery({ catalogueId, poleId, days }) {
  const query = { ...periodQuery(days) };
  if (catalogueId) query.catalogue_id = catalogueId;
  if (poleId) query.pole_id = poleId;
  return query;
}

export function typeCount(rows, type) {
  const row = (rows || []).find((item) => item.type === type);
  return row?.count || 0;
}

export function uniqueReaders(rows) {
  return (rows || []).reduce((total, row) => total + (row.countDistinct_visitor_id || row.count_distinct || 0), 0);
}

export function trendRows(rows) {
  return (rows || [])
    .map((row) => ({ date: row.date || row.bucket || row.created_date || '', count: row.count || 0 }))
    .filter((row) => row.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export async function fetchOverview({ catalogueId, poleId, days }) {
  const query = buildQuery({ catalogueId, poleId, days });
  const [byType, readers, pages, sources, devices, trend] = await Promise.all([
    base44.entities.CatalogueEvent.aggregate({ query, groupBy: 'type' }),
    base44.entities.CatalogueEvent.aggregate({ query, countDistinct: 'visitor_id' }),
    base44.entities.CatalogueEvent.aggregate({
      query: { ...query, type: 'page' },
      groupBy: 'page_number',
      sort: '-count',
      limit: 12,
    }),
    base44.entities.CatalogueEvent.aggregate({ query: { ...query, type: 'view' }, groupBy: 'source' }),
    base44.entities.CatalogueEvent.aggregate({ query: { ...query, type: 'view' }, groupBy: 'device' }),
    base44.entities.CatalogueEvent.aggregate({
      query: { ...query, type: 'view' },
      dateBucket: { field: 'created_date', unit: 'day' },
    }),
  ]);
  return {
    byType: byType.rows || [],
    readers: uniqueReaders(readers.rows),
    topPages: pages.rows || [],
    sources: (sources.rows || []).sort((a, b) => b.count - a.count),
    devices: (devices.rows || []).sort((a, b) => b.count - a.count),
    trend: trendRows(trend.rows),
  };
}

export async function fetchCatalogueViews(days = 30) {
  const result = await base44.entities.CatalogueEvent.aggregate({
    query: { ...periodQuery(days), type: 'view' },
    groupBy: 'catalogue_id',
  });
  const map = {};
  (result.rows || []).forEach((row) => {
    map[row.catalogue_id] = row.count || 0;
  });
  return map;
}

export async function exportEvents({ catalogueId, poleId, days }) {
  const query = buildQuery({ catalogueId, poleId, days });
  const rows = [];
  let cursor;
  for (let page = 0; page < 20; page += 1) {
    const result = await base44.entities.CatalogueEvent.filter(query, {
      sort: '-created_date',
      limit: 1000,
      fields: ['type', 'catalogue_id', 'page_number', 'source', 'device', 'created_date'],
      cursor,
    });
    rows.push(...result.items);
    if (!result.has_more) break;
    cursor = result.next_cursor;
  }
  return rows;
}

export const SOURCE_LABELS = {
  direct: 'Direct',
  email: 'E-mail',
  reseaux: 'Réseaux sociaux',
  recherche: 'Recherche',
  qr: 'QR code',
  autre: 'Autre',
};

export const DEVICE_LABELS = {
  mobile: 'Mobile',
  tablette: 'Tablette',
  ordinateur: 'Ordinateur',
};