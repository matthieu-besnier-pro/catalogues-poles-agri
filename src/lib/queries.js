import { base44 } from '@/api/base44Client';
import { fetchCatalogueViews, periodQuery, uniqueReaders } from '@/lib/stats';
import { cached } from '@/lib/statsCache';

export async function fetchStudioHome(days = 30) {
  return cached(`studio-home:${days}`, async () => {
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
      readers: uniqueReaders(readers.rows),
      views,
    };
  });
}