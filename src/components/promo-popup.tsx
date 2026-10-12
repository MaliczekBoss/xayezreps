"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Copy, X } from "lucide-react";
import { agentsById } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { Modal } from "./modal";
import { WELCOME_KEY } from "./welcome";

const SEEN_KEY = "xayez-promo-seen";
// Po zamknięciu oferta wraca po 3 dniach
const HIDE_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const DELAY_MS = 1400;

/** Okno z ofertą USFans pokazywane przy wejściu na stronę, w płaskim stylu reszty strony */
export function PromoPopup() {
  const { t } = useFormat();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = 0;
    try {
      // Przy pierwszym wejściu pokazujemy powitanie, a nie ofertę – dwa okna naraz to za dużo
      if (!window.localStorage.getItem(WELCOME_KEY)) return;
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
  const partner = agentsById.get("usfans");
  const copy = () => copyWithNotice(code, { title: t("n.copiedCode", { code }), text: t("n.copiedCodeText", { agent: site.partner.name }) });

  return (
    <Modal open={open} onClose={close} labelledBy="oferta-tytul" className="max-w-[27rem]">
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_32px_80px_-24px_rgb(0_0_0/0.9)] sm:p-6">
        <div className="flex items-center gap-3">
          {partner && (
            <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-line bg-black">
              <Image src={partner.logo} alt="" fill sizes="2.75rem" className="object-contain p-1" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{site.partner.name}</p>
            <p className="text-[13px] text-muted">
              {t("promo.partner")} xayezreps
              <span className="ml-2 rounded-[5px] bg-gl px-[7px] py-[3px] align-[1px] text-[10px] font-bold text-white">{t("promo.limited")}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <X aria-hidden size={16} />
            <span className="sr-only">{t("promo.close")}</span>
          </button>
        </div>

        <h2 id="oferta-tytul" className="mt-5 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] short:mt-4 short:text-2xl">
          {t("promo.title1")} <span className="fancy text-[1.1em] text-muted">{t("promo.title2")}</span>
        </h2>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">{t("promo.lead")}</p>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line short:hidden">
          <button type="button" onClick={copy} title={t("promo.copy")} className="group bg-bg px-4 py-3 text-left transition-colors hover:bg-card-hover">
            <span className="block text-xs text-muted">{t("promo.codeLabel")}</span>
            <span className="mt-0.5 flex items-center gap-2 font-mono font-semibold">
              {code}
              <Copy aria-hidden size={13} className="text-dim transition-colors group-hover:text-fg" />
            </span>
          </button>
          <div className="bg-bg px-4 py-3">
            <p className="text-xs text-muted">{t("promo.couponLabel", { agent: site.partner.name })}</p>
            <p className="mt-0.5 font-mono font-semibold">{site.promo.coupon}</p>
          </div>
        </div>

        <a
          href={site.partner.signupUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={close}
          className="group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg text-[0.9375rem] font-medium text-bg transition-colors hover:bg-white"
        >
          {t("promo.cta")}
          <ArrowRight aria-hidden size={16} className="transition-transform group-hover:translate-x-0.5" />
          <span className="sr-only">{t("newTab")}</span>
        </a>
        <p className="mt-3 text-center text-xs text-dim short:hidden">{t("promo.note")}</p>
      </div>
    </Modal>
  );
}
