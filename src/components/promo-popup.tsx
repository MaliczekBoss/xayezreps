"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Copy, X } from "lucide-react";
import { agentsById } from "@/lib/agents";
import { copyWithNotice } from "@/lib/clipboard";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";
import { LogoMark } from "./logo";
import { Modal } from "./modal";
import { WELCOME_KEY } from "./welcome";

const DELAY_MS = 1200;

/** Okno z ofertą USFans: przy każdym wejściu na stronę główną i każdym jej odświeżeniu */
export function PromoPopup() {
  const { t } = useFormat();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // Przy pierwszym wejściu jest powitanie (z kodem w pierwszym kroku) – dwa okna naraz to za dużo
      if (!window.localStorage.getItem(WELCOME_KEY)) return;
    } catch {}
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => setOpen(false);
  const code = site.promo.code;
  const partner = agentsById.get("usfans");
  const copy = () => copyWithNotice(code, { title: t("n.copiedCode", { code }), text: t("n.copiedCodeText", { agent: site.partner.name }) });

  return (
    <Modal open={open} onClose={close} labelledBy="oferta-tytul" className="max-w-[28rem]">
      <div className="rounded-3xl border border-line bg-card p-5 shadow-[0_32px_80px_-24px_rgb(0_0_0/0.9)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-bg text-fg">
            <LogoMark className="h-[1.15rem] w-auto" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[1.0625rem] leading-none tracking-[-0.02em]">
              <span className="fancy text-[1.12em]">xayez</span>
              <span className="font-semibold">reps</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-medium">
              <span className="rounded-md border border-line-strong px-2 py-0.5 text-muted">
                {t("promo.partner")} {site.partner.name}
              </span>
              <span className="rounded-md bg-gl/15 px-2 py-0.5 text-gl">{t("promo.limited")}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-bg text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <X aria-hidden size={16} />
            <span className="sr-only">{t("promo.close")}</span>
          </button>
        </div>

        <h2 id="oferta-tytul" className="mt-6 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] short:mt-4 short:text-[1.625rem]">
          {t("promo.title1")}
          <span className="fancy block text-[1.12em] font-normal text-muted">{t("promo.title2")}</span>
        </h2>

        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          {t("promo.text1")}{" "}
          <button
            type="button"
            onClick={copy}
            title={t("promo.copy")}
            className="group mx-0.5 inline-flex translate-y-[-1px] items-center gap-1.5 rounded-lg border border-gl/40 bg-gl/10 px-2 py-0.5 align-middle font-mono text-[0.875rem] font-semibold text-fg transition-colors hover:border-gl"
          >
            {code}
            <Copy aria-hidden size={12} className="text-gl" />
          </button>{" "}
          {t("promo.text2")}
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-bg p-3 pr-4">
          {partner && (
            <span className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-line bg-black">
              <Image src={partner.logo} alt="" fill sizes="2.5rem" className="object-contain p-1" />
            </span>
          )}
          <p className="min-w-0 flex-1 text-[0.9375rem] font-medium">{t("promo.coupon", { agent: site.partner.name })}</p>
          <p className="shrink-0 text-xl font-semibold tracking-[-0.02em] text-gl tabular">{site.promo.coupon}</p>
        </div>

        <a
          href={site.partner.signupUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={close}
          className="group mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-fg text-[0.9375rem] font-semibold text-bg transition-colors hover:bg-white"
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
