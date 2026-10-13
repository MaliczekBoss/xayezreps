import { HaulSection } from "@/components/haul-section";
import { Hero } from "@/components/hero";
import { ProductRow } from "@/components/product-row";
import { PromoPopup } from "@/components/promo-popup";
import { QcFeed } from "@/components/qc-feed";
import { SellersRow } from "@/components/sellers-row";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Tools } from "@/components/tools";
import { NEW_FOR_DAYS, sortNewest, sortPopular } from "@/lib/finds";
import { getQcFeed, getQcIndex, withQc } from "@/lib/qc-feed";
import { getSellers } from "@/lib/remote";
import { sellerStats } from "@/lib/seller-stats";
import { getToolPreviews } from "@/lib/tool-previews";
import { site } from "@/lib/site";
import { getAllFinds, getFinds, getOutfits } from "@/lib/store";
import { live } from "@/lib/live";
import { OutfitsRow } from "@/components/outfits";
import { summarizeOutfits } from "@/lib/outfits";

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW = 16;
// Kategorie z własnym rzędem na stronie głównej, jak na cadenreps
const CATEGORY_ROWS = ["Buty", "Bluzy"] as const;
// Pasek kategorii pod wyszukiwarką: kolejność i zdjęcie do każdej – wybrany ręcznie pojedynczy produkt,
// który dobrze wygląda w małym rozmiarze (gdy zniknie z katalogu, bierzemy najpopularniejszy z kategorii)
const HERO_CATEGORIES: [category: string, coverId: string][] = [
  ["Buty", "wzlwn7kxy7"],
  ["Koszulki", "u0olbicwl6"],
  ["Bluzy", "v05ue8wm6q"],
  ["Swetry", "bx38ldiszp"],
  ["Kurtki", "47jo4n2juf"],
  ["Komplety", "ye7soqgcwj"],
  ["Spodnie", "yoqexwhkhx"],
  ["Spodenki", "2c2n9yqydo"],
  ["Czapki", "y66a86mngh"],
  ["Torby", "xx2t5seccz"],
  ["Paski", "uxbwnvqdbk"],
  ["Biżuteria", "sod9lne2kp"],
  ["Zegarki", "7sr5s4elst"],
  ["Akcesoria", "t8jtv7olyf"],
  ["Elektronika", "2d9ofpjd51"],
  ["Bielizna", "a36azxs3g9"],
  ["Perfumy", "zonnmauv7z"],
  ["Klocki", "s06w1bcycn"],
];

export default async function Home() {
  const [raw, all, qcIndex, qcFeed, sellers, outfits, toolPreviews] = await Promise.all([
    getFinds(),
    getAllFinds(),
    getQcIndex(),
    getQcFeed(),
    getSellers(),
    getOutfits(),
    getToolPreviews(),
  ]);
  const finds = withQc(await live(raw), qcIndex);
  const newest = sortNewest(finds);
  const popular = sortPopular(finds);

  // „Nowy” liczymy względem ostatnio dodanego produktu, żeby strona mogła zostać statyczna
  const latest = newest[0] ? Date.parse(newest[0].createdAt) : 0;
  const isNew = (f: (typeof finds)[number]) => latest - Date.parse(f.createdAt) <= NEW_FOR_DAYS * DAY_MS;
  // Do rzędów idą tylko id z danego rzędu, a nie wszystkie nowe produkty z katalogu
  const newIn = (items: typeof finds) => items.filter(isNew).map((f) => f.id);

  const byId = new Map(finds.map((f) => [f.id, f]));
  const heroCategories = HERO_CATEGORIES.map(([category, id]) => ({
    category,
    image: byId.get(id)?.image || popular.find((f) => f.category === category && f.image)?.image || "",
  })).filter((c) => c.image);
  // Liczby pod wyszukiwarką: cały katalog i findy ze zdjęciami QC, z miniaturami produktów bez tła do każdej
  // (same zdjęcia z magazynu są w tak małym rozmiarze nieczytelne)
  const proof = {
    finds: finds.length,
    qc: finds.filter((f) => (f.qc ?? 0) > 0).length,
    findThumbs: heroCategories.slice(0, 3).map((c) => c.image),
    qcThumbs: popular.flatMap((f) => (f.qcCover && f.image.startsWith("/i/") ? [f.image] : [])).slice(0, 3),
  };
  const newestRow = newest.slice(0, ROW);
  const popularRow = popular.slice(0, ROW);

  const sellerCards = sellers
    .slice(0, 8)
    .map(({ slug, name, description, items }) => ({ slug, name, description, ...sellerStats(items), thumbs: items.slice(0, 3).map((i) => i.image) }));

  return (
    <>
      <SiteHeader />
      <PromoPopup />
      <main>
        <Hero categories={heroCategories} proof={proof} previews={toolPreviews} />
        <ProductRow id="findy" title="rows.newest" href={`${site.routes.finds}?sort=newest`} items={newestRow} newIds={newIn(newestRow)} />
        <ProductRow id="popularne" title="rows.popular" href={site.routes.finds} items={popularRow} newIds={newIn(popularRow)} />
        <QcFeed entries={qcFeed} />
        <OutfitsRow outfits={summarizeOutfits(outfits, all).slice(0, 12)} />
        <SellersRow sellers={sellerCards} />
        <HaulSection />
        {CATEGORY_ROWS.map((c) => {
          const items = popular.filter((f) => f.category === c).slice(0, ROW);
          return items.length >= 4 ? (
            <ProductRow
              key={c}
              id={`kategoria-${c.toLowerCase()}`}
              category={c}
              href={`${site.routes.finds}?category=${encodeURIComponent(c)}`}
              items={items}
              newIds={newIn(items)}
            />
          ) : null;
        })}
        <Tools previews={toolPreviews} />
      </main>
      <SiteFooter />
    </>
  );
}
