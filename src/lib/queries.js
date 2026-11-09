import { base44 } from '@/api/base44Client';
import { buildQuery, fetchCatalogueViews, uniqueReaders } from '@/lib/stats';
import { cached } from '@/lib/statsCache';

export async function fetchStudioHome(days = 30, poleId = '', poleIds = []) {
  return cached(`studio-home:${days}:${poleId}:${poleIds.join(',')}`, async () => {
    const period = buildQuery({ poleId, poleIds, days });
    const cataloguesQuery = { status: { $ne: 'archived' } };
    if (poleId) cataloguesQuery.pole_id = poleId;
    else if (poleIds.length) cataloguesQuery.pole_id = { $in: poleIds };
    const countQuery = { status: 'published' };
    if (poleId) countQuery.pole_id = poleId;
    else if (poleIds.length) countQuery.pole_id = { $in: poleIds };
    const [list, published, byType, readers, views] = await Promise.all([
      base44.entities.Catalogue.filter(cataloguesQuery, { sort: '-created_date', limit: 60 }),
      base44.entities.Catalogue.count(countQuery),
      base44.entities.CatalogueEvent.aggregate({ query: period, groupBy: 'type' }),
      base44.entities.CatalogueEvent.aggregate({ query: period, countDistinct: 'visitor_id' }),
      fetchCatalogueViews(days, poleId, poleIds),
    ]);
    return {
      catalogues: list.items || [],
      published,
      byType: byType.rows || [],
      readers: uniqueReaders(readers.rows),
      views,
    };
  });
}