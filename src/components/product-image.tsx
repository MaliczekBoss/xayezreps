import Image from "next/image";
import { IMAGES_URL, isCutoutImage } from "@/lib/images";

const OPTIMIZED_HOSTS = [
  "si.geilicdn.com",
  "img.alicdn.com",
  "kk-oss-wh-hk.kakobuy.com",
  "kk-oss-wh-hk.kakobyy.com",
  "kako-alosshk-pic.oss-cn-hongkong.aliyuncs.com",
  "media.usfans.com",
  "a-wh.loongbuy.com",
  "img.customizeify.com",
];

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

export const isCutout = isCutoutImage;

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
