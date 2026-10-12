"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, BookOpen, Calculator, Camera, Check, ImageUp, Link2, Store, Truck, type LucideIcon } from "lucide-react";
import type { DictKey } from "@/lib/dict";
import { shippingCost, withPackaging } from "@/lib/haul";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { ProductImage } from "./product-image";
import { SectionTitle } from "./ui";

type ToolId = "photo" | "converter" | "tracking" | "qc" | "sellers" | "calc" | "guide";

export const tools: { id: ToolId; icon: LucideIcon; title: DictKey; text: DictKey; href: string }[] = [
  { id: "photo", icon: ImageUp, title: "tools.photo", text: "tools.photoText", href: site.routes.photoSearch },
  { id: "converter", icon: Link2, title: "tools.converter", text: "tools.converterText", href: site.routes.linkConverter },
  { id: "tracking", icon: Truck, title: "tools.tracking", text: "tools.trackingText", href: site.routes.tracking },
  { id: "qc", icon: Camera, title: "tools.qc", text: "tools.qcText", href: site.routes.qcFinder },
  { id: "sellers", icon: Store, title: "tools.sellers", text: "tools.sellersText", href: site.routes.sellers },
  { id: "calc", icon: Calculator, title: "tools.calc", text: "tools.calcText", href: site.routes.shipCalculator },
  { id: "guide", icon: BookOpen, title: "tools.guide", text: "tools.guideText", href: site.routes.tutorial },
];

/** Prawdziwe dane do podglądów w kafelkach: zdjęcia findów, zdjęcia QC, sklepy */
export type ToolPreviews = {
  products: { image: string; name: string }[];
  qc: string[];
  sellerThumbs: string[];
  sellerCount: number;
  sellerItems: number;
  sellers: { name: string; itemCount: number; thumbs: string[] }[];
};

export function Tools({ previews }: { previews: ToolPreviews }) {
  const { t } = useFormat();
  return (
    <section id="narzedzia" aria-labelledby="narzedzia-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionTitle id="narzedzia-title" title={[t("tools.title1"), t("tools.title2")]} href={site.routes.tools} linkLabel={t("rows.seeAll")} />
      <ToolGrid previews={previews} className="mt-5" />
    </section>
  );
}

/** Siatka narzędzi: każdy kafelek pokazuje mały podgląd tego, co narzędzie robi, a po najechaniu – animację */
export function ToolGrid({ previews, className = "" }: { previews: ToolPreviews; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {tools.map((tool, i) => (
        <li key={tool.id} className={i === 0 ? "sm:col-span-2" : ""}>
          <ToolTile tool={tool} previews={previews} />
        </li>
      ))}
    </ul>
  );
}

function ToolTile({ tool, previews }: { tool: (typeof tools)[number]; previews: ToolPreviews }) {
  const { t } = useFormat();
  const [hover, setHover] = useState(false);
  const [auto, setAuto] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = tool.icon;

  // Na telefonie nie ma najechania – animacja rusza, gdy kafelek wjedzie na ekran
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(([entry]) => setAuto(entry.isIntersecting), { threshold: 0.7 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={tool.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group flex h-full flex-col rounded-xl border border-line bg-card p-3 transition-colors hover:border-line-strong"
    >
      <div aria-hidden="true" className="relative h-32 overflow-hidden rounded-lg border border-line bg-bg transition-colors group-hover:border-line-strong">
        <Preview id={tool.id} previews={previews} playing={hover || auto} />
      </div>
      <div className="flex items-start gap-3 px-1.5 pb-1 pt-3.5">
        <Icon aria-hidden size={17} className="mt-0.5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t(tool.title)}</span>
          <span className="mt-0.5 block text-sm text-muted">{t(tool.text)}</span>
        </span>
        <ArrowUpRight aria-hidden size={16} className="mt-0.5 shrink-0 text-dim transition-colors group-hover:text-fg" />
      </div>
    </Link>
  );
}

/** Postęp animacji 0–1 od chwili najechania; bez najechania (albo przy ograniczonym ruchu) zawsze 1 */
function useProgress(playing: boolean, duration: number) {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    if (!playing || reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduce, duration]);
  return playing && !reduce ? progress : 1;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;

const Thumb = ({ src, className = "" }: { src?: string; className?: string }) => (
  <span className={`relative block overflow-hidden rounded-md bg-[#1c1c1f] ${className}`}>{src && <ProductImage src={src} sizes="6rem" />}</span>
);

function Preview({ id, previews, playing }: { id: ToolId; previews: ToolPreviews; playing: boolean }) {
  const views: Record<ToolId, ReactNode> = {
    photo: <PhotoPreview previews={previews} playing={playing} />,
    converter: <ConverterPreview playing={playing} />,
    tracking: <TrackingPreview playing={playing} />,
    qc: <QcPreview previews={previews} playing={playing} />,
    sellers: <SellersPreview previews={previews} playing={playing} />,
    calc: <CalcPreview playing={playing} />,
    guide: <GuidePreview playing={playing} />,
  };
  return views[id];
}

/** Skaner przesuwa się po zdjęciu, AI rozpoznaje produkt, wyniki pojawiają się po kolei */
function PhotoPreview({ previews, playing }: { previews: ToolPreviews; playing: boolean }) {
  const { products } = previews;
  const p = useProgress(playing, 2200);
  const scanning = p < 0.5;
  const shown = p < 0.5 ? 0 : Math.ceil(((p - 0.5) / 0.5) * 4);
  return (
    <div className="flex h-full items-center gap-4 px-4">
      <span className="relative size-24 shrink-0">
        <Thumb src={products[0]?.image} className="size-full" />
        {scanning && <span className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-white/25 to-white/50 shadow-[0_2px_0_rgb(255_255_255/0.9)]" style={{ top: `${(p / 0.5) * 100 - 25}%` }} />}
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute -m-1 size-4 rounded-[3px] border-fg ${c}`} />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-white/[0.07] px-2 py-1 text-[11px] text-muted">
          AI <span className="truncate text-fg">{scanning ? "Analizuję zdjęcie…" : products[0]?.name}</span>
        </span>
        <span className="mt-2.5 flex gap-1.5">
          {products.slice(0, 4).map((item, i) => (
            <Thumb
              key={i}
              src={item.image}
              className={`size-12 transition-[opacity,transform] duration-300 ${i < shown ? `translate-y-0 ${i === 0 ? "opacity-100" : "opacity-70"}` : "translate-y-2 opacity-0"} ${
                i === 0 ? "ring-1 ring-fg ring-offset-2 ring-offset-bg" : ""
              }`}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

/** Link USFans „wpisuje się” znak po znaku, na końcu „Skopiowano” */
function ConverterPreview({ playing }: { playing: boolean }) {
  const p = useProgress(playing, 1500);
  const out = "usfans.com/product/3/7665059571?ref=xayez";
  const typed = out.slice(0, Math.round(easeOut(p) * out.length));
  const refAt = out.indexOf("?ref");
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-4 font-mono text-[11px]">
      <span className="truncate text-dim">weidian.com/item.html?itemID=7665059571</span>
      <ArrowDown aria-hidden size={13} className={`text-muted transition-transform duration-500 ${playing && p < 1 ? "translate-y-0.5" : ""}`} />
      <span className="truncate text-fg">
        {typed.slice(0, refAt)}
        <span className="text-gl">{typed.slice(refAt)}</span>
        {p < 1 && <span className="ml-px inline-block h-3 w-[6px] translate-y-0.5 animate-pulse bg-fg" />}
      </span>
      <span className={`mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-gl/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-gl transition-opacity duration-300 ${playing && p === 1 ? "opacity-100" : "opacity-0"}`}>
        <Check aria-hidden size={11} strokeWidth={3} />
        Skopiowano
      </span>
    </div>
  );
}

/** Ciężarówka jedzie z Chin przez Europę do Ciebie */
function TrackingPreview({ playing }: { playing: boolean }) {
  const p = useProgress(playing, 2000);
  const at = playing ? easeOut(p) * 100 : 62;
  const done = playing && p === 1;
  return (
    <div className="flex h-full flex-col justify-center px-5">
      <div className="relative flex items-center justify-between">
        <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
        <span className="absolute left-1 top-1/2 h-px -translate-y-1/2 bg-gl" style={{ width: `calc(${at}% - 0.5rem)` }} />
        {["CN", "EU", "PL"].map((c, i) => {
          const lit = at >= i * 50 - 1;
          return (
            <span key={c} className={`relative grid size-7 place-items-center rounded-full border text-[9px] font-bold transition-colors ${lit ? "border-gl bg-gl/15 text-gl" : "border-line-strong bg-bg text-muted"}`}>
              {c}
            </span>
          );
        })}
        <Truck aria-hidden size={15} className="absolute top-1/2 -translate-x-1/2 -translate-y-[155%] text-fg" style={{ left: `${Math.min(96, Math.max(4, at))}%` }} />
      </div>
      <div className="mt-2.5 flex justify-between text-[10px] text-muted">
        <span>Guangzhou</span>
        <span>Lipsk</span>
        <span className={done ? "font-semibold text-gl" : ""}>{done ? "Dostarczono" : "Ty"}</span>
      </div>
    </div>
  );
}

/** Zdjęcia z magazynu wjeżdżają jedno po drugim */
function QcPreview({ previews, playing }: { previews: ToolPreviews; playing: boolean }) {
  const p = useProgress(playing, 1100);
  return (
    <div className="grid h-full grid-cols-3 gap-1.5 p-2">
      {[0, 1, 2].map((i) => {
        const visible = p > i * 0.28;
        return (
          <Thumb
            key={i}
            src={previews.qc[i] ?? previews.products[i + 4]?.image}
            className={`h-full transition-[opacity,transform] duration-500 ${visible ? "translate-y-0 rotate-0 opacity-100" : "translate-y-4 -rotate-2 opacity-0"}`}
          />
        );
      })}
    </div>
  );
}

/** Liczba produktów odlicza się w górę, sklepy rozsuwają się */
function SellersPreview({ previews, playing }: { previews: ToolPreviews; playing: boolean }) {
  const f = useFormat();
  const p = useProgress(playing, 1300);
  return (
    <div className="flex h-full items-center gap-4 px-4">
      <span className="flex">
        {previews.sellerThumbs.slice(0, 3).map((src, i) => (
          <Thumb key={i} src={src} className={`size-11 rounded-full border-2 border-bg transition-[margin] duration-500 ${i ? (playing ? "-ml-2" : "-ml-4") : ""}`} />
        ))}
      </span>
      <span className="min-w-0 text-[12px] leading-snug text-muted">
        <span className="block font-mono text-base font-medium text-fg tabular">{f.t("sellers.items", { n: Math.round(easeOut(p) * previews.sellerItems) })}</span>
        {previews.sellerCount} sklepów
      </span>
    </div>
  );
}

/** Waga i cena odliczają się, pasek wagi się wypełnia */
function CalcPreview({ playing }: { playing: boolean }) {
  const f = useFormat();
  const p = easeOut(useProgress(playing, 1400));
  const grams = withPackaging(1000);
  return (
    <div className="flex h-full flex-col justify-center px-5">
      <span className="font-mono text-2xl font-medium tabular">≈ {f.money(Math.round(p * shippingCost(grams, "standard")))}</span>
      <span className="mt-1 text-[11px] text-muted tabular">{f.weight(Math.round(p * grams), "kg")}, EU Standard</span>
      <span className="mt-2.5 flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < Math.round(p * 3) ? "bg-fg" : "bg-line-strong"}`} />
        ))}
      </span>
    </div>
  );
}

/** Kroki zapalają się po kolei */
function GuidePreview({ playing }: { playing: boolean }) {
  const p = useProgress(playing, 1500);
  const lit = playing ? Math.ceil(p * 6) : 2;
  return (
    <div className="flex h-full items-center justify-center gap-1.5 px-4">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <span
          key={n}
          className={`fancy grid size-9 place-items-center rounded-full border text-lg transition-[color,border-color,transform] duration-300 ${
            n <= lit ? "border-fg text-fg" : "border-line-strong text-dim"
          } ${playing && n === lit && p < 1 ? "scale-110" : ""}`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}
