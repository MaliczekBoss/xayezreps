import Image from "next/image";
import { IMAGES_URL, isCutoutImage } from "@/lib/images";

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

// Serwer naszych zdjęć (jeśli są poza paczką) – dopisany też w next.config.ts
const IMAGES_HOST = IMAGES_URL ? new URL(IMAGES_URL).hostname : "";

function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.includes(host) || host === IMAGES_HOST;
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

/** Zdjęcia produktów bez tła z public/i (albo z serwera zdjęć) – już zmniejszone, więc idą prosto, bez przeliczania */
export const isCutout = isCutoutImage;

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
