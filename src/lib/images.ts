const raw = (process.env.NEXT_PUBLIC_IMAGES_URL ?? "").trim().replace(/\/+$/, "");

export const IMAGES_URL = /^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(raw) ? raw : "";

const OWN = /^\/(i|s|o)\//;

export const imageUrl = (src: string) => (IMAGES_URL && OWN.test(src) ? `${IMAGES_URL}${src}` : src);

export const isCutoutImage = (src: string) => src.startsWith("/i/") || (IMAGES_URL !== "" && src.startsWith(`${IMAGES_URL}/i/`));
