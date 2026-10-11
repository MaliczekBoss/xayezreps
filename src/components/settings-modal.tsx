"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Settings2, X } from "lucide-react";
import { agents } from "@/lib/agents";
import { translate } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { currencies, languages, updateSettings, type Currency, type Lang } from "@/lib/settings";
import { useFormat } from "@/lib/use-format";
import { Flag } from "./flag";
import { Modal } from "./modal";

const pill = (active: boolean) =>
  `inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
    active
      ? "border-fg bg-fg/[0.06] text-fg shadow-[0_0_0_1px_var(--color-fg)]"
      : "border-line bg-bg/60 text-muted hover:border-line-strong hover:text-fg"
  }`;

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line py-5">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden="true" className="font-semibold">
        {title}
      </p>
      <p className="mt-0.5 text-sm text-muted">{text}</p>
      <div className="mt-3.5 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useFormat();
  const { settings, t } = f;

  const setAgent = (id: (typeof agents)[number]["id"]) => {
    if (id === settings.agent) return;
    updateSettings({ agent: id });
    const name = agents.find((a) => a.id === id)?.name ?? id;
    notify({ tone: "brand", image: `/agents/${id}.png`, title: t("n.agent", { name }), text: t("n.agentText", { name }) });
  };

  const setLang = (lang: Lang) => {
    if (lang === settings.lang) return;
    updateSettings({ lang });
    const label = languages.find((l) => l.code === lang)?.label ?? lang;
    notify({ tone: "brand", title: translate(lang, "n.lang", { name: label }) });
  };

  const setCurrency = (currency: Currency) => {
    if (currency === settings.currency) return;
    updateSettings({ currency });
    notify({ tone: "brand", title: t("n.currency", { name: currency }), text: t("n.currencyText") });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="ustawienia-tytul" className="max-w-[34rem]">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-card p-6 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.06),transparent)]" />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-line-strong bg-bg text-fg">
            <Settings2 aria-hidden size={19} />
          </span>
          <h2 id="ustawienia-tytul" className="text-xl font-semibold tracking-[-0.02em]">
            {t("settings.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-9 place-items-center rounded-full border border-line bg-bg/60 text-muted hover:text-fg"
          >
            <X aria-hidden size={16} />
            <span className="sr-only">{t("settings.close")}</span>
          </button>
        </div>
        <p className="relative mb-5 mt-4 text-sm text-muted">{t("settings.lead")}</p>

        <Section title={t("settings.agent")} text={t("settings.agentText")}>
          {agents.map((a, i) => {
            const active = settings.agent === a.id;
            return (
              <button key={a.id} type="button" aria-pressed={active} onClick={() => setAgent(a.id)} className={pill(active)}>
                <span className="relative size-6 overflow-hidden rounded-md bg-black/40">
                  <Image src={a.logo} alt="" fill sizes="1.5rem" className="object-contain p-0.5" />
                </span>
                {a.name}
                {i === 0 && (
                  <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-300">
                    {t("settings.recommended")}
                  </span>
                )}
              </button>
            );
          })}
        </Section>

        <Section title={t("settings.lang")} text={t("settings.langText")}>
          {languages.map((l) => {
            const active = settings.lang === l.code;
            return (
              <button key={l.code} type="button" aria-pressed={active} onClick={() => setLang(l.code)} className={pill(active)} lang={l.code}>
                <Flag code={l.flag} className="h-3.5 w-[1.3125rem]" />
                {l.label}
              </button>
            );
          })}
        </Section>

        <Section title={t("settings.currency")} text={t("settings.currencyText")}>
          {currencies.map((c) => {
            const active = settings.currency === c;
            return (
              <button key={c} type="button" aria-pressed={active} onClick={() => setCurrency(c)} className={`${pill(active)} font-mono`}>
                {c}
              </button>
            );
          })}
        </Section>

        <div className="flex items-center justify-between gap-4 border-t border-dashed border-line pt-5">
          <p className="text-xs text-dim">{t("settings.saved")}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-xl bg-fg px-6 text-sm font-medium text-bg transition-colors hover:bg-white"
          >
            {t("settings.done")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
