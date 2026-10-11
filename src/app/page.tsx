import { HaulSection } from "@/components/haul-section";
import { Hero } from "@/components/hero";
import { ProductRow } from "@/components/product-row";
import { PromoPopup } from "@/components/promo-popup";
import { QcFeed } from "@/components/qc-feed";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Tools } from "@/components/tools";
import { NEW_FOR_DAYS, sortNewest, sortPopular } from "@/lib/finds";
import { site } from "@/lib/site";
import { getFinds } from "@/lib/store";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function Home() {
  const finds = await getFinds();
  const newest = sortNewest(finds);
  const popular = sortPopular(finds);

  // „Nowy” liczymy względem ostatnio dodanego produktu, żeby strona mogła zostać statyczna
  const latest = newest[0] ? Date.parse(newest[0].createdAt) : 0;
  const newIds = newest.filter((f) => latest - Date.parse(f.createdAt) <= NEW_FOR_DAYS * DAY_MS).map((f) => f.id);

  return (
    <>
      <SiteHeader />
      <PromoPopup />
      <main>
        <Hero finds={finds} />
        <ProductRow id="findy" title={["rows.newest1", "rows.newest2"]} href={`${site.routes.finds}?sort=newest`} items={newest} newIds={newIds} />
        <ProductRow id="popularne" title={["rows.popular1", "rows.popular2"]} href={`${site.routes.finds}?sort=popular`} items={popular} />
        <QcFeed />
        <HaulSection />
        <Tools />
      </main>
      <SiteFooter />
    </>
  );
}
