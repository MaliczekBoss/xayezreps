"use client";

import { Copy } from "lucide-react";
import { copyWithNotice } from "@/lib/clipboard";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";

/** Kod promocyjny z przyciskiem kopiowania. Potwierdzenie pokazuje wyspa. */
export function CopyCode({ code, label }: { code: string; label: string }) {
  const { t } = useFormat();

  return (
    <button
      type="button"
      onClick={() =>
        copyWithNotice(code, {
          title: t("n.copiedCode", { code }),
          text: t("n.copiedCodeText", { agent: site.partner.name }),
        })
      }
      className="group inline-flex h-11 items-center gap-3 rounded-xl border border-dashed border-line-strong bg-card pl-4 pr-1.5 text-sm transition-colors hover:border-fg hover:bg-card-hover"
    >
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold tracking-wide text-fg">{code}</span>
      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bg px-3 text-xs font-medium text-fg">
        <Copy aria-hidden size={13} />
        {t("copy.copy")}
      </span>
    </button>
  );
}
