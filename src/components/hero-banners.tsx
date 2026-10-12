"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Sparkles, Store } from "lucide-react";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { DiscordIcon } from "./discord-icon";
import { ProductImage } from "./product-image";
import type { ToolPreviews } from "./tools";

const ROTATE_MS = 6500;

type Slide = {
  id: string;
  /** Tło i kolor tekstu banera */
  theme: string;
  chip: ReactNode;
  title: string;
  cta: string;
  href: string;
  external: boolean;
  /** Ciemny przycisk na jasnym tle */
  darkCta?: boolean;
  art: ReactNode;
};

const Thumb = ({ src, className = "" }: { src?: string; className?: string }) => (
  <span className={`relative block overflow-hidden bg-[#1c1c1f] ${className}`}>{src && <ProductImage src={src} sizes="10rem" />}</span>
);

/** Rotujące banery w hero: kupony USFans, Discord, sprzedawcy, szukanie po zdjęciu */
export function HeroBanners({ data }: { data: ToolPreviews }) {
  const f = useFormat();
  const { t } = f;
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [first, second, third] = data.products;

  const slides: Slide[] = [
    {
      id: "coupons",
      theme: "bg-[linear-gradient(135deg,#1e3a8a,#1d4ed8_55%,#3b82f6)] text-white",
      chip: (
        <>
          <Check aria-hidden size={13} strokeWidth={3} />
          {t("hb.couponsChip", { agent: site.partner.name })}
        </>
      ),
      title: t("hb.couponsTitle"),
      cta: t("hb.couponsCta"),
      href: site.partner.signupUrl,
      external: true,
      art: <CouponsArt code={site.promo.code} coupon={site.promo.coupon} />,
    },
    {
      id: "discord",
      theme: "bg-[linear-gradient(135deg,#1c1d45,#33368f_60%,#5865f2)] text-white",
      chip: (
        <>
          <DiscordIcon size={13} />
          {t("hb.discordChip")}
        </>
      ),
      title: t("hb.discordTitle"),
      cta: t("hb.discordCta"),
      href: site.socials.discord,
      external: true,
      art: <DiscordArt products={data.products.slice(0, 3)} qc={data.qc} newLabel={t("card.new")} />,
    },
    {
      id: "sellers",
      theme: "bg-[linear-gradient(135deg,#efe9df,#ddd2c1)] text-[#1c1917]",
      chip: (
        <>
          <Store aria-hidden size={13} />
          {t("hb.sellersChip")}
        </>
      ),
      title: t("hb.sellersTitle"),
      cta: t("hb.sellersCta"),
      href: site.routes.sellers,
      external: false,
      darkCta: true,
      art: <SellersArt sellers={data.sellers} label={t("hb.fromShop")} count={(n) => t("sellers.items", { n })} />,
    },
    {
      id: "photo",
      theme: "bg-[#18181b] text-white",
      chip: (
        <>
          <Sparkles aria-hidden size={13} />
          {t("hb.photoChip")}
        </>
      ),
      title: t("hb.photoTitle"),
      cta: t("hb.photoCta"),
      href: site.routes.photoSearch,
      external: false,
      art: <PhotoArt items={[first, second, third].filter(Boolean)} />,
    },
  ];

  useEffect(() => {
    if (reduce || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [reduce, paused, slides.length]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div
      className="group/banners relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-roledescription="carousel" aria-label={t("banner.label")} className="relative h-[17rem] overflow-hidden rounded-2xl border border-white/10 sm:h-auto sm:aspect-[2.1/1]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              aria-hidden={!active}
              className={`absolute inset-0 ${s.theme} transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[52%] origin-right scale-[0.8] sm:w-[52%] sm:scale-100">
                {s.art}
              </div>
              <div className="relative z-10 flex h-full w-[64%] flex-col justify-center p-5 sm:w-[54%] sm:p-7">
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.darkCta ? "bg-black/[0.07]" : "bg-white/15"}`}>
                  {s.chip}
                </span>
                <p className="mt-3 text-[clamp(1.25rem,2.3vw,1.875rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{s.title}</p>
                <Link
                  href={s.href}
                  tabIndex={active ? undefined : -1}
                  {...(s.external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
                  className={`mt-4 inline-flex h-10 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-transform after:absolute after:inset-0 after:content-[''] hover:-translate-y-px sm:h-11 sm:px-5 ${
                    s.darkCta ? "bg-[#1c1917] text-white" : "bg-white text-[#111112]"
                  }`}
                >
                  {s.cta}
                  <ArrowUpRight aria-hidden size={15} />
                  {s.external && <span className="sr-only">, {t("newTab")}</span>}
                </Link>
              </div>
            </div>
          );
        })}

        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => go(side === "left" ? -1 : 1)}
            className={`absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/55 focus-visible:opacity-100 group-hover/banners:opacity-100 md:grid ${
              side === "left" ? "left-3" : "right-3"
            }`}
          >
            {side === "left" ? <ChevronLeft aria-hidden size={18} /> : <ChevronRight aria-hidden size={18} />}
            <span className="sr-only">{side === "left" ? t("carousel.prev") : t("carousel.next")}</span>
          </button>
        ))}

        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-[width,background-color] ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"}`}
            >
              <span className="sr-only">{t("banner.goto", { n: i + 1 })}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Ilustracje ---------- */

/** Dwa kupony z ząbkowaną krawędzią: −40% z kodem i 10 kg za 350 zł */
function CouponsArt({ code, coupon }: { code: string; coupon: string }) {
  const scallop = "[mask-image:radial-gradient(circle_at_7px_100%,transparent_5px,#000_5.5px)] [mask-size:14px_100%] [mask-repeat:repeat-x]";
  return (
    <div className="absolute inset-0">
      <div className="absolute right-[-6%] top-[12%] w-[72%] rotate-[7deg] overflow-hidden rounded-xl bg-white shadow-[0_20px_40px_-12px_rgb(0_0_0/0.45)]">
        <div className={`bg-[#0f172a] px-4 pb-4 pt-3 text-white ${scallop}`}>
          <p className="text-[clamp(1.25rem,2.4vw,1.75rem)] font-bold tracking-[-0.02em]">350 zł</p>
        </div>
        <p className="px-4 py-3 text-[11px] font-medium text-[#334155]">10 kg wysyłki, EU Standard</p>
      </div>
      <div className="absolute bottom-[12%] right-[10%] w-[74%] -rotate-[5deg] overflow-hidden rounded-xl bg-white text-[#0f172a] shadow-[0_24px_48px_-12px_rgb(0_0_0/0.55)]">
        <div className={`bg-[#facc15] px-4 pb-4 pt-3 ${scallop}`}>
          <p className="text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold tracking-[-0.03em]">{coupon}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#334155]">
            na wysyłkę z kodem <span className="rounded border border-dashed border-[#94a3b8] px-1 font-mono font-bold text-[#0f172a]">{code}</span>
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#e2e8f0] pt-2.5">
            <span className="flex items-center gap-1.5 text-[10px] text-[#64748b]">
              <span className="relative size-4 overflow-hidden rounded bg-black">
                <Image src="/agents/usfans.png" alt="" fill sizes="1rem" className="object-contain" />
              </span>
              USFans
            </span>
            <span className="rounded-md bg-[#0f172a] px-2.5 py-1 text-[10px] font-semibold text-white">Użyj</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Karty kanałów z Discorda z prawdziwymi findami i zdjęciami QC – bez wymyślonych wiadomości */
function DiscordArt({ products, qc, newLabel }: { products: ToolPreviews["products"]; qc: string[]; newLabel: string }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute right-[-8%] top-[8%] w-[62%] rotate-[6deg] rounded-xl border border-white/10 bg-[#1e1f22] p-2.5 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.6)]">
        <p className="text-[10px] font-semibold text-white/60"># qc-check</p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {qc.slice(0, 3).map((src, i) => (
            <Thumb key={i} src={src} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
      <div className="absolute bottom-[8%] right-[8%] w-[78%] -rotate-[4deg] rounded-xl border border-white/10 bg-[#2b2d31] p-2.5 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.65)]">
        <p className="text-[10px] font-semibold text-white/60"># nowe-findy</p>
        <ul className="mt-2 space-y-1.5">
          {products.map((p, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-1.5">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[11px] font-semibold text-white">{p.name}</span>
                  {i === 0 && <span className="shrink-0 rounded bg-[#5865f2] px-1 text-[8px] font-bold text-white">{newLabel.toUpperCase()}</span>}
                </span>
              </span>
              <Thumb src={p.image} className="size-8 shrink-0 rounded-md" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Dwie karty sklepów z prawdziwymi produktami */
function SellersArt({ sellers, label, count }: { sellers: ToolPreviews["sellers"]; label: string; count: (n: number) => string }) {
  const card = (s: ToolPreviews["sellers"][number] | undefined, className: string) =>
    s && (
      <div className={`absolute w-[56%] rounded-2xl border border-black/10 bg-[#18181b] p-2.5 text-white shadow-[0_24px_48px_-14px_rgb(0_0_0/0.45)] ${className}`}>
        <div className="flex items-center gap-2">
          <Thumb src={s.thumbs[0]} className="size-7 shrink-0 rounded-full" />
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold">{s.name}</span>
            <span className="block text-[9px] text-white/55">{count(s.itemCount)}</span>
          </span>
        </div>
        <Thumb src={s.thumbs[1]} className="mt-2 aspect-[4/3] rounded-lg" />
        <p className="mt-2 text-[9px] text-white/55">{label}</p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {s.thumbs.slice(2, 5).map((src, i) => (
            <Thumb key={i} src={src} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  return (
    <div className="absolute inset-0">
      {card(sellers[1], "right-[-10%] top-[6%] rotate-[6deg]")}
      {card(sellers[0], "bottom-[-14%] right-[22%] -rotate-[5deg]")}
    </div>
  );
}

/** Zdjęcie w ramce skanera i wyniki AI */
function PhotoArt({ items }: { items: ToolPreviews["products"] }) {
  return (
    <div className="absolute inset-0 line-grid">
      <div className="absolute right-[6%] top-1/2 w-[80%] -translate-y-1/2 -rotate-[3deg] rounded-2xl border border-white/10 bg-[#111112] p-3 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.7)]">
        <div className="flex gap-3">
          <span className="relative aspect-square w-[46%] shrink-0">
            <Thumb src={items[0]?.image} className="size-full rounded-lg" />
            {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
              <span key={c} className={`absolute -m-1 size-4 rounded-[3px] border-white ${c}`} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/10 px-1.5 py-1 text-[10px] text-white/60">
              AI <span className="truncate text-white">{items[0]?.name}</span>
            </span>
            <span className="mt-2 grid grid-cols-2 gap-1.5">
              {items.slice(0, 4).map((p, i) => (
                <Thumb key={i} src={p.image} className={`aspect-square rounded-md ${i === 0 ? "ring-1 ring-white" : "opacity-70"}`} />
              ))}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
