import { base44 } from '@/api/base44Client';
import {
  canvasToBlob,
  extractOutline,
  extractPageLinks,
  extractPageText,
  openPdfFile,
  renderImageFileToCanvas,
  renderPageToCanvas,
} from '@/lib/pdfEngine';
import { detectOperationDate, uniqueSlug } from '@/lib/format';

const SCREEN_WIDTH = 1500;
const PAGE_BATCH = 8;
const PAGE_CONCURRENCY = 3;

// Last resort when the cover has no selectable text at all (its text is
// vectorised/drawn rather than real PDF text, common on heavily designed
// covers) — ask Base44's built-in vision model to read the date straight off
// the cover image. Costs AI credits, so callers only reach for this after
// the free text-based detection has already failed, never as a first try.
export async function detectOperationDateFromImage(imageUrl) {
  if (!imageUrl) return '';
  try {
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: imageUrl,
      json_schema: {
        type: 'object',
        properties: {
          operation_month: {
            type: 'string',
            description:
              "Le mois et l'année de l'opération commerciale ou de la promotion affichée sur cette image (la date de DÉBUT si une période du type \"DU ... AU ...\" est indiquée), au format AAAA-MM, par exemple \"2026-10\" pour octobre 2026. Renvoie une chaîne vide si aucun mois et aucune année ne sont visibles sur l'image.",
          },
        },
      },
    });
    const raw = String(result?.operation_month || '').trim();
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? `${raw}-01` : '';
  } catch (error) {
    return '';
  }
}

export const NO_CROP = { top: 0, right: 0, bottom: 0, left: 0 };

export function hasCrop(crop) {
  return !!crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0);
}

export function cropLabel(crop) {
  return hasCrop(crop) ? 'Recadrage manuel appliqué' : 'Aucune TrimBox détectée : pages diffusées sans rognage';
}

// The flipbook sizes every page from page 1's ratio alone (one shared frame
// for the whole book) — a replacement rendered at its own natural size would
// throw that off, showing up undersized/off-centre next to its neighbours.
// Composing it onto a canvas matching the original page's exact width and
// height keeps the book's geometry untouched, whatever shape the new file is.
function fitToFrame(source, targetWidth, targetHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  context.drawImage(source, Math.round((targetWidth - width) / 2), Math.round((targetHeight - height) / 2), width, height);
  return canvas;
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
  let coverText = '';
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
    // One upload per page, not two: every consumer of the page image already
    // renders it through the <Image> component, which resizes Wix-hosted
    // images to their container on the fly via the CDN — a separate
    // pre-shrunk thumbnail file was a second UploadPublicFile call (and its
    // credit cost) for a size the CDN already serves from the original.
    const screen = await upload(canvas, `page-${number}.webp`, 'image/webp', 0.82);
    canvas.width = 0;
    canvas.height = 0;
    const [text, links] = await Promise.all([extractPageText(doc, number), extractPageLinks(doc, number)]);
    if (number === 1) {
      cover = screen.file_url;
      coverText = text;
    }
    completed += 1;
    onProgress({ stage: `Page ${completed} sur ${total}`, percent: 6 + Math.round((completed / total) * 84), page: number, total });
    batch.push({
      catalogue_id: catalogueId,
      version_id: versionId,
      page_number: number,
      image_url: screen.file_url,
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
  return { total, toc, cover, coverText };
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
      // L'essentiel du signal vient de ce qui est réellement imprimé sur la
      // couverture ("Offre valable du 1er au 30 avril 2026") ; le nom du
      // fichier ne sert que de repli quand la couverture n'en dit rien.
      operation_date: meta.operationDate || detectOperationDate(file.name, result.coverText, new Date().getFullYear()),
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

// Swaps a single page in place — the file dropped can be a one-page PDF
// (same crop as the rest of the catalogue applies, for visual consistency)
// or a plain image (already final, used as-is). Everything else — the other
// pages, the version history, the conserved source PDF — stays untouched;
// there's no reason a one-page fix should re-process the whole catalogue.
export async function replaceCataloguePage({ catalogue, pageNumber, file, onProgress }) {
  const notify = onProgress || (() => {});
  notify({ stage: 'Lecture de la page', percent: 5 });

  const existing = await base44.entities.CataloguePage.filter(
    { version_id: catalogue.active_version_id, page_number: pageNumber },
    { limit: 1 },
  );
  const record = existing.items?.[0];
  if (!record) throw new Error(`Page ${pageNumber} introuvable dans ce catalogue.`);

  notify({ stage: 'Lecture du fichier déposé', percent: 15 });
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  let rendered;
  let text = '';
  let links = [];
  let release = null;

  if (isPdf) {
    const opened = await openPdfFile(file);
    release = opened.release;
    try {
      rendered = await renderPageToCanvas(opened.doc, 1, { targetWidth: SCREEN_WIDTH, crop: catalogue.crop });
      [text, links] = await Promise.all([extractPageText(opened.doc, 1), extractPageLinks(opened.doc, 1)]);
    } finally {
      release();
    }
  } else {
    rendered = await renderImageFileToCanvas(file, SCREEN_WIDTH);
  }

  // Match the existing page's exact dimensions (when known) so the book's
  // shared ratio — set once from page 1 — isn't thrown off by this one page.
  const targetWidth = record.width || rendered.width;
  const targetHeight = record.height || rendered.height;
  const framed = fitToFrame(rendered.canvas, targetWidth, targetHeight);
  rendered.canvas.width = 0;
  rendered.canvas.height = 0;

  notify({ stage: 'Envoi de la page', percent: 55 });
  const screen = await upload(framed, `page-${pageNumber}-${Date.now()}.webp`, 'image/webp', 0.82);
  framed.width = 0;
  framed.height = 0;

  notify({ stage: 'Mise à jour du catalogue', percent: 85 });
  await base44.entities.CataloguePage.update(record.id, {
    image_url: screen.file_url,
    width: targetWidth,
    height: targetHeight,
    text,
    links,
  });

  if (pageNumber === 1) {
    await base44.entities.Catalogue.update(catalogue.id, { cover_url: screen.file_url });
  }

  notify({ stage: 'Page remplacée', percent: 100 });
  return { pageNumber, image_url: screen.file_url };
}