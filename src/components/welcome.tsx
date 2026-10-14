"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { agents, type ProductSource } from "@/lib/agents";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/notify";
import { currencies, languages, localeOf, updateSettings, type Currency } from "@/lib/settings";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Flag } from "./flag";
import { Modal } from "./modal";
import { ProductImage } from "./product-image";

/** Ustawione przy zamknięciu powitania; bez niego okno pokazuje się przy wejściu na stronę */
export const WELCOME_KEY = "xayez-welcome-v1";
const DELAY_MS = 900;

export type WelcomeSample = { name: string; image: string; pricePln: number; source: ProductSource };

const STEPS = ["agent", "lang", "currency"] as const;
type Step = (typeof STEPS)[number];

// Krok wjeżdża z kierunku, w którym idziemy (dalej – z prawej, wstecz – z lewej)
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

/** Znak XR rysowany kreska po kresce przy otwarciu okna */
function DrawnMark({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const fill = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } };
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true" focusable="false" fill="currentColor">
      <motion.path d="M3.6 3h5.5l11.5 16.6h-5.5z" style={{ transformOrigin: "12px 11px" }} {...fill(0.15)} />
      <motion.path d="M17.9 12.3h5.4l5.2 7.3h-5.4z" style={{ transformOrigin: "23px 16px" }} {...fill(0.75)} />
      <motion.path
        d="M2.2 21.6 15.9 4.1h7.6c3 0 4.6 1.6 4.4 3.8-.2 2.4-2.4 4-5.4 4h-4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.7, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Wartość, która przy zmianie wjeżdża od dołu – cena i nazwa agenta w podglądzie */
function Swap({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-grid overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={id}
          initial={reduce ? false : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: "-100%", opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Powitanie przy pierwszym wejściu: trzy kroki (agent, język, waluta), a obok prawdziwy find,
 * który od razu pokazuje skutek wyboru – cenę w nowej walucie i przycisk do wybranego agenta.
 */
export function Welcome({ sample }: { sample: WelcomeSample | null }) {
  const f = useFormat();
  const { t, settings } = f;
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    try {
      if (window.localStorage.getItem(WELCOME_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
    // Sprawdzamy tylko przy pierwszym wejściu, nie przy każdej zmianie strony
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remember = () => {
    try {
      window.localStorage.setItem(WELCOME_KEY, String(Date.now()));
    } catch {}
  };

  const skip = () => {
    remember();
    setOpen(false);
  };

  const finish = () => {
    remember();
    setOpen(false);
    notify({
      tone: "success",
      image: f.agent.logo,
      logo: true,
      title: t("welcome.doneTitle"),
      text: t("welcome.doneText", { agent: f.agent.name, currency: settings.currency }),
    });
  };

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const current: Step = STEPS[step];
  const last = step === STEPS.length - 1;
  const buyUrl = sample ? f.buyUrl(sample.source) : null;
  // Adres pokazujemy razem z kodem polecającym (ref, affcode…), a długi parametr z linkiem do sklepu skracamy
  const buyLink = (() => {
    if (!buyUrl) return null;
    const u = new URL(buyUrl);
    const params = [...u.searchParams];
    const kept = params.filter(([k]) => k !== "url").map(([k, v]) => `${k}=${v}`);
    const ref = kept.length ? `?${kept.length < params.length ? "…&" : ""}${kept.join("&")}` : "";
    return { path: u.host.replace(/^www\./, "") + u.pathname, ref };
  })();
  const priceIn = (c: Currency) => (sample ? formatMoney(sample.pricePln, c, localeOf(settings.lang), f.rates) : c);

  const option = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
      active ? "border-fg bg-fg/[0.06] shadow-[0_0_0_1px_var(--color-fg)]" : "border-line bg-bg/50 hover:border-line-strong"
    }`;

  const radio = (active: boolean) => (
    <span
      aria-hidden="true"
      className={`ml-auto size-5 shrink-0 place-items-center rounded-full border transition-colors ${active ? "grid border-fg bg-fg text-bg" : "hidden border-line-strong sm:grid"}`}
    >
      {active && <Check size={12} strokeWidth={3} />}
    </span>
  );

  const body: Record<Step, ReactNode> = {
    agent: (
      <div role="radiogroup" aria-labelledby="welcome-title" className="grid gap-2">
        {agents.map((a, i) => {
          const active = settings.agent === a.id;
          return (
            <button key={a.id} type="button" role="radio" aria-checked={active} onClick={() => updateSettings({ agent: a.id })} className={option(active)}>
              <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-black">
                <Image src={a.logo} alt="" fill sizes="2.25rem" className="object-contain p-1" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-medium">
                  {a.name}
                  {i === 0 && <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-300">{t("settings.recommended")}</span>}
                </span>
                {i === 0 && <span className="block text-[13px] text-muted">{t("welcome.agentPromo", { code: site.promo.code, coupon: site.promo.coupon })}</span>}
              </span>
              {radio(active)}
            </button>
          );
        })}
      </div>
    ),
    lang: (
      <div role="radiogroup" aria-labelledby="welcome-title" className="grid grid-cols-2 gap-2">
        {languages.map((l) => {
          const active = settings.lang === l.code;
          return (
            <button key={l.code} type="button" role="radio" aria-checked={active} lang={l.code} onClick={() => updateSettings({ lang: l.code })} className={option(active)}>
              <Flag code={l.flag} className="h-3.5 w-[1.3125rem] shrink-0" />
              <span className="truncate font-medium">{l.label}</span>
              {radio(active)}
            </button>
          );
        })}
      </div>
    ),
    currency: (
      <div role="radiogroup" aria-labelledby="welcome-title" className="grid grid-cols-2 gap-2">
        {currencies.map((c) => {
          const active = settings.currency === c;
          return (
            <button key={c} type="button" role="radio" aria-checked={active} onClick={() => updateSettings({ currency: c })} className={option(active)}>
              <span className="min-w-0">
                <span className="block font-mono font-semibold">{c}</span>
                {sample && <span className="block truncate font-mono text-[13px] text-muted tabular">{priceIn(c)}</span>}
              </span>
              {radio(active)}
            </button>
          );
        })}
      </div>
    ),
  };

  const titles: Record<Step, [string, string]> = {
    agent: [t("welcome.agentTitle"), t("welcome.agentText")],
    lang: [t("welcome.langTitle"), t("welcome.langText")],
    currency: [t("welcome.currencyTitle"), t("welcome.currencyText")],
  };

  return (
    <Modal open={open} onClose={skip} labelledBy="welcome-title" className="max-w-[52rem]">
      {/* Fokus na całym oknie, a nie na pierwszym przycisku („Pomiń”), żeby nie świecił obramowaniem */}
      <div
        tabIndex={-1}
        autoFocus
        className="grid overflow-hidden rounded-[1.75rem] border border-line-strong bg-card shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] outline-none md:grid-cols-[19rem_minmax(0,1fr)]"
      >
        {/* Podgląd: prawdziwy find, który zmienia się razem z wyborem */}
        <aside className="relative flex flex-col gap-4 border-b border-line bg-bg p-5 md:border-b-0 md:border-r md:p-6">
          <div className="flex items-center gap-2 text-fg">
            {open && <DrawnMark className="h-5 w-auto" />}
            <span className="text-[1.0625rem] leading-none tracking-[-0.02em]">
              <span className="fancy text-[1.12em]">xayez</span>
              <span className="font-semibold">reps</span>
            </span>
          </div>

          {sample && (
            <div className="flex gap-3 md:flex-col">
              <span className="relative aspect-square w-20 shrink-0 md:w-full">
                <ProductImage src={sample.image} sizes="(min-width: 768px) 16rem, 5rem" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="hidden text-xs text-dim md:block">{t("welcome.preview")}</p>
                <p className="truncate font-medium md:mt-1">{sample.name}</p>
                <Swap id={`${settings.currency}-${settings.lang}`} className="mt-0.5 font-mono text-xl font-semibold tabular md:text-2xl">
                  {f.money(sample.pricePln)}
                </Swap>
                <div className="mt-2.5 flex h-10 items-center gap-2 rounded-xl bg-fg px-3 text-sm font-medium text-bg md:mt-4">
                  <span className="relative size-6 shrink-0 overflow-hidden rounded-md bg-black">
                    <Image key={f.agent.id} src={f.agent.logo} alt="" fill sizes="1.5rem" className="object-contain p-0.5" />
                  </span>
                  <Swap id={`${f.agent.id}-${settings.lang}`} className="min-w-0 truncate">
                    {t("card.buy", { agent: f.agent.name })}
                  </Swap>
                  <ArrowUpRight aria-hidden size={15} className="ml-auto shrink-0" />
                </div>
                {buyLink && (
                  <p className="mt-1.5 hidden min-w-0 font-mono text-[11px] text-dim md:flex">
                    <span className="truncate">{buyLink.path}</span>
                    <span className="shrink-0 text-muted">{buyLink.ref}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Kroki */}
        <div className="flex min-h-[26rem] flex-col p-5 sm:p-6 md:p-7">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted tabular">{t("welcome.step", { n: step + 1, total: STEPS.length })}</p>
            <div aria-hidden="true" className="flex flex-1 gap-1">
              {STEPS.map((s, i) => (
                <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.span
                    className="block h-full rounded-full bg-fg"
                    initial={false}
                    animate={{ width: i <= step ? "100%" : "0%" }}
                    transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              ))}
            </div>
            <button type="button" onClick={skip} className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">
              {t("welcome.skip")}
            </button>
          </div>

          <div className="relative mt-6 flex-1">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={current}
                custom={dir}
                variants={stepVariants}
                initial={reduce ? false : "enter"}
                animate="center"
                exit={reduce ? undefined : "exit"}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 id="welcome-title" className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">
                  {titles[current][0]}
                </h2>
                <p className="mt-1 text-sm text-muted">{titles[current][1]}</p>
                <div className="mt-5">{body[current]}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-bg/60 px-4 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <ArrowLeft aria-hidden size={15} />
                {t("welcome.back")}
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : go(step + 1))}
              className="ml-auto inline-flex h-11 items-center rounded-xl bg-fg px-6 text-sm font-medium text-bg transition-colors hover:bg-white"
            >
              {last ? t("welcome.finish") : t("welcome.next")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
