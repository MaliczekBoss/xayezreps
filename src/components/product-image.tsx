import Image from "next/image";

// Hosty skonfigurowane w next.config.ts – inne zdjęcia pokazujemy bez optymalizacji
const OPTIMIZED_HOSTS = ["cdn.xayezreps.com", "xayezreps.pl", "si.geilicdn.com", "img.alicdn.com", "kk-oss-wh-hk.kakobuy.com", "xayezreps.com"];

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

type ProductImageProps = {
  src: string;
  alt?: string;
  sizes: string;
  preload?: boolean;
  className?: string;
  onError?: () => void;
};

/** Zdjęcie produktu wypełniające rodzica. Działa też z linkami spoza listy hostów. */
export function ProductImage({ src, alt = "", sizes, preload, className = "", onError }: ProductImageProps) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={!canOptimize(src)}
      className={`object-cover ${className}`}
      onError={onError}
    />
  );
}
