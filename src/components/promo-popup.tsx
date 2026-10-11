"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Flame, Gift, Sparkles, Star, X } from "lucide-react";
import { copyWithNotice } from "@/lib/clipboard";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { LogoMark } from "./logo";
import { Modal } from "./modal";

const SEEN_KEY = "xayez-promo-seen";
// Po zamknięciu oferta wraca po 3 dniach
const HIDE_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const DELAY_MS = 1400;

/** Okno z ofertą USFans pokazywane przy wejściu na stronę */
export function PromoPopup() {
  const { t } = useFormat();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {}
    if (Date.now() - seen < HIDE_FOR_MS) return;
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {}
  };

  const code = site.promo.code;

  return (
    <Modal open={open} onClose={close} labelledBy="oferta-tytul" className="max-w-[30rem]">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-brand/35 bg-card p-6 shadow-[0_40px_120px_-30px_rgb(37_99_235/0.55)] sm:p-7 short:p-5">
        {/* Tło: poświata i siatka */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.35),transparent)]" />
          <div className="line-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_60%)]" />
        </div>

        {/* Pływające kafelki */}
        <div aria-hidden="true" className="pointer-events-none absolute right-[4.75rem] top-6 hidden sm:block">
          <span className="float grid size-10 rotate-12 place-items-center rounded-xl bg-[linear-gradient(150deg,#7cb4ff,#3b82f6_45%,#1d4ed8)] text-white shadow-[0_12px_30px_-8px_rgb(37_99_235/0.9)]">
            <Gift size={20} />
          </span>
        </div>

        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line-strong bg-bg text-fg">
              <LogoMark className="h-4 w-auto" />
            </span>
            <div>
              <p className="font-semibold">xayezreps</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-bright">
                  <Star aria-hidden size={10} className="fill-current" />
                  {t("promo.partner")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-300">
                  <Star aria-hidden size={10} className="fill-current" />
                  {t("promo.limited")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="ml-auto grid size-9 shrink-0 place-items-center rounded-full border border-line bg-bg/70 text-muted hover:text-fg"
            >
              <X aria-hidden size={16} />
              <span className="sr-only">{t("promo.close")}</span>
            </button>
          </div>

          <h2 id="oferta-tytul" className="mt-6 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[2.25rem] short:mt-4 short:text-[1.75rem]">
            {t("promo.title1")} <span className="fancy text-[1.12em] text-brand-bright">{t("promo.title2")}</span>
          </h2>

          <p className="mt-3 leading-relaxed text-muted">
            {t("promo.text1")}{" "}
            <button
              type="button"
              onClick={() => copyWithNotice(code, { title: t("n.copiedCode", { code }), text: t("n.copiedCodeText", { agent: site.partner.name }) })}
              title={t("promo.copy")}
              className="mx-0.5 inline-flex items-center rounded-lg border border-dashed border-brand/60 bg-brand/10 px-2 py-0.5 align-baseline font-mono text-sm font-semibold text-fg hover:bg-brand/20"
            >
              {code}
            </button>{" "}
            {t("promo.text2")}
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/[0.07] p-3.5 short:hidden">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-bright">
              <Flame aria-hidden size={18} />
            </span>
            <span className="flex-1 text-sm font-medium">{t("promo.coupon", { agent: site.partner.name })}</span>
            <span className="text-2xl font-semibold tracking-[-0.03em] text-brand-bright tabular">{site.promo.coupon}</span>
          </div>

          <a
            href={site.partner.signupUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={close}
            className="group mt-5 inline-flex h-14 w-full short:mt-4 short:h-12 items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(180deg,#60a5fa,#3b82f6_55%,#2563eb)] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_14px_40px_-10px_rgb(59_130_246/0.85)] transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
          >
            <Sparkles aria-hidden size={17} />
            {t("promo.cta")}
            <ArrowRight aria-hidden size={17} className="transition-transform group-hover:translate-x-0.5" />
            <span className="sr-only">{t("newTab")}</span>
          </a>
          <p className="mt-3 text-center text-xs text-dim short:hidden">{t("promo.note")}</p>
        </div>
      </div>
    </Modal>
  );
}
