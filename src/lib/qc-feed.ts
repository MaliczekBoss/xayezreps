// Przykładowe wpisy do sekcji „Ostatnio wyszukiwane QC”.
// Docelowo podepnij tu dane z QC Findera.

export type QcEntry = {
  title: string;
  photos: number;
  priceCny?: number;
  source: "Weidian" | "Taobao" | "1688" | "Agent";
  image?: string;
  /** Link do produktu, który otwieramy w QC Finderze */
  url: string;
};

export const qcFeed: QcEntry[] = [
  {
    title: "Dior B30 – siateczkowe sneakersy low",
    photos: 98,
    priceCny: 151,
    source: "Agent",
    image: "https://si.geilicdn.com/weidian1636173600-498300000196a5bff1f00a23047e_1536_1536.jpg.webp?w=700&cp=1",
    url: "https://usfans.com/product/3/7836232555",
  },
  {
    title: "Jersey",
    photos: 28,
    priceCny: 63,
    source: "Agent",
    image: "https://si.geilicdn.com/open1762039621-252808396-603e00000196254d7cd90aa08290_800_800.jpg.webp?w=700&cp=1",
    url: "https://www.usfans.com/product/3/7668167910",
  },
  {
    title: "Torba boston w stylu retro",
    photos: 5,
    priceCny: 38,
    source: "Agent",
    image: "https://img.alicdn.com/img/ibank/O1CN01LLQaNG1FifOlmw3gi_!!2215674030521-0-cib.jpg_.webp",
    url: "https://www.usfans.com/product/1/910810010468",
  },
  {
    title: "Produkt z 1688",
    photos: 330,
    source: "1688",
    url: "https://detail.1688.com/offer/899097262099.html",
  },
  {
    title: "Produkt z 1688",
    photos: 224,
    source: "1688",
    url: "https://detail.1688.com/offer/1023019498225.html",
  },
  {
    title: "Produkt z 1688",
    photos: 80,
    source: "1688",
    url: "https://detail.1688.com/offer/951843666453.html",
  },
];
