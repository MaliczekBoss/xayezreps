/** Znak XR – przerysowany z logo.webp do wektora, żeby był ostry w każdym rozmiarze */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true" focusable="false" fill="currentColor">
      {/* Gruba kreska X */}
      <path d="M3.6 3h5.5l11.5 16.6h-5.5z" />
      {/* Noga R */}
      <path d="M17.9 12.3h5.4l5.2 7.3h-5.4z" />
      {/* Cienka kreska X przechodząca w brzuszek R */}
      <path
        d="M2.2 21.6 15.9 4.1h7.6c3 0 4.6 1.6 4.4 3.8-.2 2.4-2.4 4-5.4 4h-4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** „xayez” szeryfową kursywą, „reps” zwykłym krojem */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-[1.05rem] w-auto" />
      <span className="text-[1.1875rem] leading-none tracking-[-0.02em]">
        <span className="fancy text-[1.12em]">xayez</span>
        <span className="font-semibold">reps</span>
      </span>
    </span>
  );
}
