import { base44 } from '@/api/base44Client';
import { fetchCatalogueViews, periodQuery } from '@/lib/stats';

export async function fetchStudioHome(days = 30) {
  const period = periodQuery(days);
  const [list, published, byType, readers, views] = await Promise.all([
    base44.entities.Catalogue.filter({ status: { $ne: 'archived' } }, { sort: '-created_date', limit: 60 }),
    base44.entities.Catalogue.count({ status: 'published' }),
    base44.entities.CatalogueEvent.aggregate({ query: period, groupBy: 'type' }),
    base44.entities.CatalogueEvent.aggregate({ query: period, countDistinct: 'visitor_id' }),
    fetchCatalogueViews(days),
  ]);
  return {
    catalogues: list.items || [],
    published,
    byType: byType.rows || [],
    readers: (readers.rows || []).reduce(
      (total, row) => total + (row.countDistinct_visitor_id || row.count_distinct || 0),
      0,
    ),
    views,
  };
}