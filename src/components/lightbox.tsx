"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useFormat } from "@/lib/use-format";
import { Modal } from "./modal";

type LightboxProps = {
  id: string;
  photos: string[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
};

const arrow =
  "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/80";

/** Podgląd zdjęcia na pełnym ekranie ze strzałkami (także z klawiatury) */
export function Lightbox({ id, photos, index, onIndex, onClose }: LightboxProps) {
  const { t } = useFormat();
  const go = (dir: 1 | -1) => index !== null && onIndex((index + dir + photos.length) % photos.length);

  return (
    <Modal open={index !== null} onClose={onClose} labelledBy={id} className="max-w-[min(60rem,100%)]">
      {index !== null && (
        <div
          className="relative"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <p id={id} className="text-sm text-white/70 tabular">
              {t("qcf.photoOf", { i: index + 1, n: photos.length })}
            </p>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X aria-hidden size={18} />
              <span className="sr-only">{t("qcf.close")}</span>
            </button>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- zdjęcia z różnych hostów, w pełnej rozdzielczości */}
            <img src={photos[index]} alt="" referrerPolicy="no-referrer" className="mx-auto max-h-[78dvh] w-auto object-contain" />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className={`${arrow} left-3`}>
                  <ChevronLeft aria-hidden size={22} />
                  <span className="sr-only">{t("qcf.prevPhoto")}</span>
                </button>
                <button type="button" onClick={() => go(1)} className={`${arrow} right-3`}>
                  <ChevronRight aria-hidden size={22} />
                  <span className="sr-only">{t("qcf.nextPhoto")}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
