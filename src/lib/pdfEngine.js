const PDFJS_VERSION = '3.11.174';
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let enginePromise = null;

export function loadPdfEngine() {
  if (typeof window !== 'undefined' && window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PDFJS_BASE}/pdf.min.js`;
    script.async = true;
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("Le moteur de conversion n'a pas pu démarrer."));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => {
      enginePromise = null;
      reject(new Error('Moteur de conversion inaccessible. Vérifiez la connexion puis réessayez.'));
    };
    document.head.appendChild(script);
  });
  return enginePromise;
}

// Le fichier déposé est lu localement : aucun PDF d'origine n'est exposé publiquement.
export async function openPdfFile(file) {
  const pdfjs = await loadPdfEngine();
  const url = URL.createObjectURL(file);
  try {
    const doc = await pdfjs.getDocument({ url }).promise;
    return { doc, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error("Ce PDF n'a pas pu être ouvert. Il est peut-être protégé ou endommagé.");
  }
}

function croppedBox(width, height, crop) {
  const inset = crop || {};
  const left = (inset.left || 0) * width;
  const top = (inset.top || 0) * height;
  const right = (inset.right || 0) * width;
  const bottom = (inset.bottom || 0) * height;
  return {
    x: left,
    y: top,
    w: Math.max(24, width - left - right),
    h: Math.max(24, height - top - bottom),
  };
}

export async function renderPageToCanvas(doc, pageNumber, { targetWidth = 1500, crop = null } = {}) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(0.4, targetWidth / base.width);
  const viewport = page.getViewport({ scale });
  const full = document.createElement('canvas');
  full.width = Math.round(viewport.width);
  full.height = Math.round(viewport.height);
  const context = full.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, full.width, full.height);
  // intent: 'print' avoids pdf.js's default display-mode pacing, which steps
  // through long pages via requestAnimationFrame — paused by the browser as
  // soon as the window loses focus or the tab is hidden, stalling the render
  // indefinitely. We rasterize to a detached canvas, never to screen, so the
  // print path (no rAF pacing) is safe here.
  await page.render({ canvasContext: context, viewport, intent: 'print' }).promise;

  const box = croppedBox(full.width, full.height, crop);
  if (box.x === 0 && box.y === 0 && box.w === full.width && box.h === full.height) {
    return { canvas: full, width: full.width, height: full.height };
  }
  const cropped = document.createElement('canvas');
  cropped.width = Math.round(box.w);
  cropped.height = Math.round(box.h);
  cropped.getContext('2d').drawImage(full, box.x, box.y, box.w, box.h, 0, 0, cropped.width, cropped.height);
  full.width = 0;
  full.height = 0;
  return { canvas: cropped, width: cropped.width, height: cropped.height };
}

export function renderThumb(sourceCanvas, width = 200) {
  const ratio = sourceCanvas.height / sourceCanvas.width;
  const thumb = document.createElement('canvas');
  thumb.width = width;
  thumb.height = Math.max(1, Math.round(width * ratio));
  const context = thumb.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, thumb.width, thumb.height);
  context.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  return thumb;
}

export function canvasToBlob(canvas, type = 'image/webp', quality = 0.82) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === type) {
        resolve(blob);
        return;
      }
      canvas.toBlob((fallback) => resolve(fallback), 'image/jpeg', 0.88);
    }, type, quality);
  });
}

export async function extractPageText(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items
    .map((item) => item.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

export async function resolveDestination(doc, destination) {
  try {
    const resolved = typeof destination === 'string' ? await doc.getDestination(destination) : destination;
    if (!resolved || !resolved[0]) return 0;
    const index = await doc.getPageIndex(resolved[0]);
    return index + 1;
  } catch (error) {
    return 0;
  }
}

export async function extractPageLinks(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const annotations = await page.getAnnotations();
  const links = [];
  for (const annotation of annotations) {
    if (!annotation.rect) continue;
    const rect = viewport.convertToViewportRectangle(annotation.rect);
    const left = Math.min(rect[0], rect[2]) / viewport.width;
    const top = Math.min(rect[1], rect[3]) / viewport.height;
    const width = Math.abs(rect[2] - rect[0]) / viewport.width;
    const height = Math.abs(rect[3] - rect[1]) / viewport.height;
    if (width <= 0.002 || height <= 0.002) continue;
    if (annotation.url) {
      links.push({ x: left, y: top, w: width, h: height, url: annotation.url, page: 0, label: annotation.url });
    } else if (annotation.dest) {
      const target = await resolveDestination(doc, annotation.dest);
      if (target) {
        links.push({ x: left, y: top, w: width, h: height, url: '', page: target, label: `Page ${target}` });
      }
    }
  }
  return links.slice(0, 120);
}

export async function extractOutline(doc) {
  const raw = await doc.getOutline();
  if (!raw || !raw.length) return [];
  const entries = [];
  const walk = async (items, level) => {
    for (const item of items) {
      const page = await resolveDestination(doc, item.dest);
      if (page) entries.push({ title: (item.title || `Page ${page}`).slice(0, 140), page, level });
      if (item.items && item.items.length) await walk(item.items, level + 1);
    }
  };
  await walk(raw, 0);
  return entries.slice(0, 300);
}