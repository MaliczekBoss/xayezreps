/** Uproszczone flagi jako SVG – emoji flag nie działają na Windowsie */
export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={`overflow-hidden rounded-[3px] ${className}`} aria-hidden="true" focusable="false">
      {code === "pl" && (
        <>
          <rect width="24" height="8" fill="#fff" />
          <rect y="8" width="24" height="8" fill="#dc143c" />
        </>
      )}
      {code === "de" && (
        <>
          <rect width="24" height="5.34" fill="#000" />
          <rect y="5.33" width="24" height="5.34" fill="#dd0000" />
          <rect y="10.66" width="24" height="5.34" fill="#ffce00" />
        </>
      )}
      {code === "fr" && (
        <>
          <rect width="8" height="16" fill="#0055a4" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" fill="#ef4135" />
        </>
      )}
      {code === "it" && (
        <>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" fill="#ce2b37" />
        </>
      )}
      {code === "es" && (
        <>
          <rect width="24" height="16" fill="#aa151b" />
          <rect y="4" width="24" height="8" fill="#f1bf00" />
        </>
      )}
      {code === "cn" && (
        <>
          <rect width="24" height="16" fill="#de2910" />
          <path
            d="m4.8 2.2.72 2.2h2.32l-1.88 1.36.72 2.2-1.88-1.36-1.88 1.36.72-2.2-1.88-1.36h2.32z"
            fill="#ffde00"
          />
          <circle cx="9.6" cy="2.4" r=".6" fill="#ffde00" />
          <circle cx="11" cy="4.2" r=".6" fill="#ffde00" />
          <circle cx="11" cy="6.6" r=".6" fill="#ffde00" />
          <circle cx="9.6" cy="8.2" r=".6" fill="#ffde00" />
        </>
      )}
      {code === "us" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={i * (16 / 13)} width="24" height={16 / 13} fill="#b22234" />
          ))}
          <rect width="10.4" height="8.6" fill="#3c3b6e" />
        </>
      )}
    </svg>
  );
}
