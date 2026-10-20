import { base44 } from '@/api/base44Client';
import {
  canvasToBlob,
  extractOutline,
  extractPageLinks,
  extractPageText,
  renderPageToCanvas,
  renderThumb,
} from '@/lib/pdfEngine';
import { uniqueSlug } from '@/lib/format';

const SCREEN_WIDTH = 1500;
const THUMB_WIDTH = 200;
const PAGE_BATCH = 8;
const PAGE_CONCURRENCY = 3;

export const NO_CROP = { top: 0, right: 0, bottom: 0, left: 0 };

export function hasCrop(crop) {
  return !!crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0);
}

export function cropLabel(crop) {
  return hasCrop(crop) ? 'Recadrage manuel appliqué' : 'Aucune TrimBox détectée : pages diffusées sans rognage';
}

async function upload(canvas, name, type, quality) {
  const blob = await canvasToBlob(canvas, type, quality);
  const file = new File([blob], name, { type: blob.type });
  return base44.integrations.Core.UploadPublicFile({ file });
}

async function renderAndStore({ doc, file, catalogueId, versionId, crop, onProgress }) {
  const total = doc.numPages;
  const toc = await extractOutline(doc);
  let batch = [];
  let cover = '';
  let completed = 0;

  // Flush before awaiting the network call, not after: two workers can both
  // reach PAGE_BATCH while the previous flush's upload is still in flight,
  // and clearing `batch` only once that await resolves would drop whichever
  // pages a faster worker pushed in the meantime.
  const flushBatch = async () => {
    if (!batch.length) return;
    const chunk = batch;
    batch = [];
    await base44.entities.CataloguePage.bulkCreate(chunk);
  };

  const processPage = async (number) => {
    const { canvas, width, height } = await renderPageToCanvas(doc, number, { targetWidth: SCREEN_WIDTH, crop });
    const [screen, thumb] = await Promise.all([
      upload(canvas, `page-${number}.webp`, 'image/webp', 0.82),
      upload(renderThumb(canvas, THUMB_WIDTH), `thumb-${number}.jpg`, 'image/jpeg', 0.78),
    ]);
    canvas.width = 0;
    canvas.height = 0;
    const [text, links] = await Promise.all([extractPageText(doc, number), extractPageLinks(doc, number)]);
    if (number === 1) cover = screen.file_url;
    completed += 1;
    onProgress({ stage: `Page ${completed} sur ${total}`, percent: 6 + Math.round((completed / total) * 84), page: number, total });
    batch.push({
      catalogue_id: catalogueId,
      version_id: versionId,
      page_number: number,
      image_url: screen.file_url,
      thumb_url: thumb.file_url,
      width,
      height,
      text,
      links,
    });
    if (batch.length >= PAGE_BATCH) await flushBatch();
  };

  // Pages render and upload PAGE_CONCURRENCY at a time instead of one at a
  // time — the original loop let the network sit idle while the next page
  // rendered, and vice versa, so throughput was gated by the slower of the
  // two instead of overlapping them.
  const queue = Array.from({ length: total }, (_, index) => index + 1);
  const worker = async () => {
    while (queue.length) {
      const number = queue.shift();
      await processPage(number);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, total) }, worker));

  await flushBatch();
  return { total, toc, cover };
}

export async function createCatalogueWithPdf({ file, doc, meta, options, crop, onProgress }) {
  onProgress({ stage: 'Création du catalogue', percent: 2 });
  const catalogue = await base44.entities.Catalogue.create({
    title: meta.title,
    description: meta.description || '',
    slug: uniqueSlug(meta.title),
    status: 'draft',
    language: meta.language || 'fr',
    pole_id: meta.pole?.id || '',
    pole_name: meta.pole?.name || '',
    pole_slug: meta.pole?.slug || '',
    page_count: 0,
    cover_url: '',
    toc: [],
    download_enabled: !!options.download_enabled,
    search_enabled: options.search_enabled !== false,
    no_index: !!options.no_index,
    password_hash: options.password_hash || '',
    theme_color: options.theme_color || meta.pole?.color || '',
    preview_token: Math.random().toString(36).slice(2, 10),
    trim_note: cropLabel(crop),
  });

  const version = await base44.entities.CatalogueVersion.create({
    catalogue_id: catalogue.id,
    label: meta.label || 'Version initiale',
    file_name: file.name,
    file_size: file.size,
    status: 'processing',
    page_count: 0,
    crop: crop || NO_CROP,
    trim_note: cropLabel(crop),
  });

  try {
    const result = await renderAndStore({ doc, file, catalogueId: catalogue.id, versionId: version.id, crop, onProgress });
    onProgress({ stage: 'Conservation du PDF d’origine', percent: 94 });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await base44.entities.CatalogueVersion.update(version.id, {
      status: 'ready',
      page_count: result.total,
      toc: result.toc,
      file_uri,
    });
    const updated = await base44.entities.Catalogue.update(catalogue.id, {
      active_version_id: version.id,
      page_count: result.total,
      cover_url: result.cover,
      toc: result.toc,
      crop: crop || NO_CROP,
      pdf_file_uri: file_uri,
      pdf_file_name: file.name,
      status: 'published',
      published_date: new Date().toISOString(),
    });
    onProgress({ stage: 'Catalogue publié', percent: 100 });
    return { catalogue: updated, version, pageCount: result.total };
  } catch (error) {
    await base44.entities.CatalogueVersion.update(version.id, {
      status: 'failed',
      error: String(error?.message || error).slice(0, 280),
    });
    throw error;
  }
}

export async function replaceCataloguePdf({ file, doc, catalogue, crop, label, onProgress }) {
  const version = await base44.entities.CatalogueVersion.create({
    catalogue_id: catalogue.id,
    label: label || `Mise à jour du ${new Date().toLocaleDateString('fr-FR')}`,
    file_name: file.name,
    file_size: file.size,
    status: 'processing',
    page_count: 0,
    crop: crop || NO_CROP,
    trim_note: cropLabel(crop),
  });

  try {
    const result = await renderAndStore({ doc, file, catalogueId: catalogue.id, versionId: version.id, crop, onProgress });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await base44.entities.CatalogueVersion.update(version.id, {
      status: 'ready',
      page_count: result.total,
      toc: result.toc,
      file_uri,
    });
    const updated = await base44.entities.Catalogue.update(catalogue.id, {
      active_version_id: version.id,
      page_count: result.total,
      cover_url: result.cover,
      toc: result.toc,
      crop: crop || NO_CROP,
      pdf_file_uri: file_uri,
      pdf_file_name: file.name,
      trim_note: cropLabel(crop),
    });
    onProgress({ stage: 'Nouvelle version en ligne', percent: 100 });
    return { catalogue: updated, version, pageCount: result.total };
  } catch (error) {
    await base44.entities.CatalogueVersion.update(version.id, {
      status: 'failed',
      error: String(error?.message || error).slice(0, 280),
    });
    throw error;
  }
}