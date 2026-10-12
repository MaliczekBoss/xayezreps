"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Sparkles, Store } from "lucide-react";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { DiscordIcon } from "./discord-icon";
import { ProductImage } from "./product-image";
import type { ToolPreviews } from "./tools";

const ROTATE_MS = 5500;
// Ile pikseli trzeba przeciągnąć kartę, żeby ją przełożyć
const SWIPE_PX = 70;
// Jak długo wierzchnia karta odlatuje w bok, zanim schowa się pod spód
const FLY_MS = 320;

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

// Ułożenie kart w wachlarzu: 0 – na wierzchu, dalej coraz głębiej; ostatnia schowana pod spodem
const POSES: TargetAndTransition[] = [
  { x: "0%", y: "0%", rotate: 0, scale: 1, opacity: 1 },
  { x: "-1.5%", y: "7%", rotate: -3, scale: 0.95, opacity: 1 },
  { x: "1.5%", y: "13%", rotate: 2.5, scale: 0.9, opacity: 1 },
  { x: "0%", y: "16%", rotate: 0, scale: 0.86, opacity: 0 },
];
// Karta przekładana jak zdjęcie: odlatuje w bok (dalej – w prawo, wstecz – wychodzi spod spodu w lewo)
const FLY_OUT: TargetAndTransition = { x: "75%", y: "-4%", rotate: 9, scale: 1, opacity: 1 };
const FLY_BACK: TargetAndTransition = { x: "-75%", y: "-4%", rotate: -9, scale: 1, opacity: 1 };

const Thumb = ({ src, className = "" }: { src?: string; className?: string }) => (
  <span className={`relative block overflow-hidden bg-[#1c1c1f] ${className}`}>{src && <ProductImage src={src} sizes="10rem" />}</span>
);

/**
 * Banery w hero jako wachlarz kart: co kilka sekund wierzchnia karta odlatuje w bok i chowa się pod spód,
 * jak przy przeglądaniu zdjęć. Kartę można przerzucić palcem albo myszką, są też strzałki i kropki.
 */
export function HeroBanners({ data }: { data: ToolPreviews }) {
  const f = useFormat();
  const { t } = f;
  const reduce = useReducedMotion();
  const [front, setFront] = useState(0);
  const [flying, setFlying] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const [paused, setPaused] = useState(false);
  const frontRef = useRef(0);
  const busy = useRef(false);
  // Po przeciągnięciu karty nie otwieramy linku, który leży pod palcem
  const dragged = useRef(false);
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

  const n = slides.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (busy.current) return;
      busy.current = true;
      const cur = frontRef.current;
      setFlying({ i: dir === 1 ? cur : (cur - 1 + n) % n, dir });
      window.setTimeout(
        () => {
          const next = (cur + dir + n) % n;
          frontRef.current = next;
          setFront(next);
          setFlying(null);
          busy.current = false;
        },
        reduce ? 0 : FLY_MS,
      );
    },
    [n, reduce],
  );

  // Odliczanie startuje od nowa po każdym przełożeniu, także ręcznym
  useEffect(() => {
    if (reduce || paused) return;
    const timer = window.setTimeout(() => go(1), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [front, paused, reduce, go]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-roledescription="carousel" aria-label={t("banner.label")} className="relative aspect-[1.35/1] w-full sm:aspect-[2/1]">
        {slides.map((s, i) => {
          const depth = (i - front + n) % n;
          const isFlying = flying?.i === i;
          const active = depth === 0 && !isFlying;
          const pose = isFlying ? (flying.dir === 1 ? FLY_OUT : FLY_BACK) : POSES[Math.min(depth, POSES.length - 1)];
          // Odlatująca karta jest nad wszystkimi, a wracająca spod spodu – pod nimi, dopóki nie wyjdzie z boku
          const zIndex = isFlying ? (flying.dir === 1 ? 50 : 5) : 40 - depth * 10;
          return (
            <motion.div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${n}`}
              aria-hidden={!active}
              initial={false}
              animate={pose}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 26 }}
              style={{ zIndex }}
              className={`absolute inset-0 ${active ? "" : "pointer-events-none"}`}
            >
              <motion.div
                drag={active ? "x" : false}
                dragSnapToOrigin
                dragElastic={0.6}
                onPointerDownCapture={() => {
                  dragged.current = false;
                }}
                onDragStart={() => {
                  dragged.current = true;
                  setPaused(true);
                }}
                onDragEnd={(_, info) => {
                  setPaused(false);
                  if (info.offset.x < -SWIPE_PX || info.velocity.x < -500) go(1);
                  else if (info.offset.x > SWIPE_PX || info.velocity.x > 500) go(-1);
                }}
                onClickCapture={(e) => {
                  if (!dragged.current) return;
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`@container relative size-full cursor-grab overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.85)] active:cursor-grabbing ${s.theme}`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[52%] origin-right scale-[0.8] sm:scale-100">
                  {s.art}
                </div>
                <div className="relative z-10 flex h-full w-[64%] flex-col justify-center p-5 sm:w-[54%] sm:p-6">
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.darkCta ? "bg-black/[0.07]" : "bg-white/15"}`}>
                    {s.chip}
                  </span>
                  <p className="mt-3 text-[clamp(1.05rem,5.2cqw,1.65rem)] font-semibold leading-[1.12] tracking-[-0.02em]">{s.title}</p>
                  <Link
                    href={s.href}
                    tabIndex={active ? undefined : -1}
                    draggable={false}
                    {...(s.external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
                    className={`mt-4 inline-flex h-10 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-transform after:absolute after:inset-0 after:content-[''] hover:-translate-y-px ${
                      s.darkCta ? "bg-[#1c1917] text-white" : "bg-white text-[#111112]"
                    }`}
                  >
                    {s.cta}
                    <ArrowUpRight aria-hidden size={15} />
                    {s.external && <span className="sr-only">, {t("newTab")}</span>}
                  </Link>
                </div>
                {/* Karty pod spodem są przyciemnione, żeby wierzchnia była wyraźna */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 bg-[#111112] transition-opacity duration-500"
                  style={{ opacity: active || isFlying ? 0 : depth === 1 ? 0.35 : 0.6 }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 flex items-center justify-center gap-3 sm:mt-14">
        <button
          type="button"
          onClick={() => go(-1)}
          className="grid size-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <ChevronLeft aria-hidden size={16} />
          <span className="sr-only">{t("carousel.prev")}</span>
        </button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <span key={s.id} aria-hidden="true" className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === front ? "w-5 bg-fg" : "w-1.5 bg-line-strong"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="grid size-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <ChevronRight aria-hidden size={16} />
          <span className="sr-only">{t("carousel.next")}</span>
        </button>
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
