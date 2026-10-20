export default function LinkZones({ links, onFollow }) {
  if (!links?.length) return null;
  return (
    <>
      {links.map((link, index) => (
        <button
          key={`${link.url || link.page}-${index}`}
          type="button"
          title={link.label || (link.url ? 'Ouvrir le lien' : `Aller à la page ${link.page}`)}
          aria-label={link.label || `Lien ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onFollow(link);
          }}
          className="absolute cursor-pointer rounded-[3px] outline-none ring-accent/60 transition-colors duration-200 hover:bg-accent/25 focus-visible:ring-2"
          style={{
            left: `${link.x * 100}%`,
            top: `${link.y * 100}%`,
            width: `${link.w * 100}%`,
            height: `${link.h * 100}%`,
          }}
        />
      ))}
    </>
  );
}