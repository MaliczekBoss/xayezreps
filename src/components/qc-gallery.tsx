"use client";

import { useEffect, useState } from "react";
import { useFormat } from "@/lib/use-format";
import { Lightbox } from "./lightbox";
import { SectionTitle } from "./ui";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; photos: string[] };

const STEP = 12;

/** Zdjęcia QC z magazynów agentów dla linku produktu, z podglądem na pełnym ekranie */
export function QcGallery({ productUrl, titleId }: { productUrl: string; titleId: string }) {
  const { t } = useFormat();
  const [state, setState] = useState<State>({ status: "loading" });
  const [limit, setLimit] = useState(STEP);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/qc?url=${encodeURIComponent(productUrl)}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        setState({ status: "ready", photos: Array.isArray(d.photos) ? d.photos : [] });
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      });
    return () => ctrl.abort();
  }, [productUrl]);

  const photos = state.status === "ready" ? state.photos : [];
  const [first, ...rest] = t("product.qc").split(" ");

  return (
    <>
      <SectionTitle id={titleId} title={[first, rest.join(" ")]} count={photos.length || undefined} />

      {state.status === "loading" && (
        <div className="mt-6">
          <p className="sr-only" aria-live="polite">
            {t("product.qcLoading")}
          </p>
          <div aria-hidden="true" className="grid animate-pulse grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-card" />
            ))}
          </div>
        </div>
      )}

      {state.status !== "loading" && photos.length === 0 && (
        <p className="mt-4 max-w-[40rem] text-muted">
          {state.status === "error" ? t("product.qcError") : t("product.qcNone")} {t("product.qcTip")}
        </p>
      )}

      {photos.length > 0 && (
        <>
          <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.slice(0, limit).map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- zdjęcia z magazynów agentów, bez optymalizacji */}
                  <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover transition-opacity hover:opacity-85" />
                  <span className="sr-only">{t("qcf.photoOf", { i: i + 1, n: photos.length })}</span>
                </button>
              </li>
            ))}
          </ul>
          {limit < photos.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + STEP * 2)}
              className="mt-5 text-sm font-semibold text-brand-bright underline-offset-4 hover:underline"
            >
              {t("product.qcMore")} ({photos.length - limit})
            </button>
          )}
        </>
      )}

      <Lightbox id={`${titleId}-lightbox`} photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </>
  );
}
