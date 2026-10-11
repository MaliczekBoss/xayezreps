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
import { getQcFeed } from "@/lib/qc-feed";
import { getSellers } from "@/lib/remote";
import { site } from "@/lib/site";
import { getFinds } from "@/lib/store";

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW = 16;
// Kategorie z własnym rzędem na stronie głównej, jak na cadenreps
const CATEGORY_ROWS = ["Buty", "Bluzy", "Koszulki"] as const;

export default async function Home() {
  const [finds, qcFeed, sellers] = await Promise.all([getFinds(), getQcFeed(), getSellers()]);
  const newest = sortNewest(finds);
  const popular = sortPopular(finds);

  // „Nowy” liczymy względem ostatnio dodanego produktu, żeby strona mogła zostać statyczna
  const latest = newest[0] ? Date.parse(newest[0].createdAt) : 0;
  const newIds = newest.filter((f) => latest - Date.parse(f.createdAt) <= NEW_FOR_DAYS * DAY_MS).map((f) => f.id);

  const sellerCards = sellers.slice(0, 8).map((s) => ({ slug: s.slug, name: s.name, itemCount: s.itemCount, image: s.items[0]?.image ?? "" }));

  return (
    <>
      <SiteHeader />
      <PromoPopup />
      <main>
        <Hero finds={finds} />
        <ProductRow id="findy" title="rows.newest" href={`${site.routes.finds}?sort=newest`} items={newest.slice(0, ROW)} newIds={newIds} />
        <ProductRow id="popularne" title="rows.popular" href={site.routes.finds} items={popular.slice(0, ROW)} newIds={newIds} />
        <QcFeed entries={qcFeed} />
        <SellersRow sellers={sellerCards} />
        {CATEGORY_ROWS.map((c) => {
          const items = popular.filter((f) => f.category === c).slice(0, ROW);
          return items.length >= 4 ? (
            <ProductRow
              key={c}
              id={`kategoria-${c.toLowerCase()}`}
              category={c}
              href={`${site.routes.finds}?category=${encodeURIComponent(c)}`}
              items={items}
              newIds={newIds}
            />
          ) : null;
        })}
        <HaulSection />
        <Tools />
      </main>
      <SiteFooter />
    </>
  );
}
