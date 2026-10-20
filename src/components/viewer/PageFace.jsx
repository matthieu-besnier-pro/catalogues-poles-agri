import { Image } from '@/components/ui/image';
import LinkZones from '@/components/viewer/LinkZones';
import { cn } from '@/lib/utils';
import { mapLinkToCrop } from '@/lib/format';

export default function PageFace({ page, face = 'static', crop, width, height, linksEnabled = true, onLink }) {
  const isOverlay = face !== 'static';
  const links = linksEnabled && page?.links?.length
    ? page.links.map((link) => ({ ...mapLinkToCrop(link, crop), url: link.url, page: link.page, label: link.label }))
    : [];

  return (
    <div
      className={cn('relative overflow-hidden bg-white', isOverlay && 'absolute inset-0')}
      style={{
        width: isOverlay ? undefined : width,
        height: isOverlay ? undefined : height,
        transform: face === 'back' ? 'rotateY(180deg)' : undefined,
        backfaceVisibility: isOverlay ? 'hidden' : undefined,
        boxShadow: isOverlay ? undefined : 'inset -1px 0 0 rgba(14,32,26,0.06)',
      }}
    >
      {page ? (
        <>
          <Image
            src={page.image_url}
            alt={`Page ${page.page_number}`}
            className="h-full w-full"
            fittingType="fit"
          />
          {linksEnabled ? <LinkZones links={links} onFollow={onLink} /> : null}
        </>
      ) : (
        <div className="h-full w-full bg-[#f2f0ea] grain" />
      )}
    </div>
  );
}