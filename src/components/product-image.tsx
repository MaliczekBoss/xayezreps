import Image from "next/image";

// Hosty skonfigurowane w next.config.ts – inne zdjęcia pokazujemy bez optymalizacji
const OPTIMIZED_HOSTS = [
  "si.geilicdn.com",
  "img.alicdn.com",
  // Magazyny agentów (zdjęcia QC)
  "kk-oss-wh-hk.kakobuy.com",
  "kk-oss-wh-hk.kakobyy.com",
  "kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com",
  "media.usfans.com",
  "a-wh.loongbuy.com",
  "img.customizeify.com",
];

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

/** Zdjęcia produktów bez tła z public/i – już zmniejszone, więc idą prosto z CDN, bez przeliczania */
export const isCutout = (src: string) => src.startsWith("/i/");

/** Zdjęcie produktu wypełniające rodzica. Działa też z linkami spoza listy hostów. */
export function ProductImage({ src, alt = "", sizes, preload, className = "", onError }: ProductImageProps) {
  if (!src) return null;
  const cutout = isCutout(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={cutout || !canOptimize(src)}
      className={`${cutout ? "cutout object-contain" : "object-cover"} ${className}`}
      onError={onError}
    />
  );
}
