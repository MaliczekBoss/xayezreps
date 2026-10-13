// Postęp długich skryptów: linijka z postępem co kilka sekund i częściowy wynik zapisywany po drodze,
// od którego następne uruchomienie zaczyna, zamiast liczyć wszystko od zera.

import { readFile, rename, rm, writeFile } from "node:fs/promises";

/** Licznik: tick() po każdej sprawdzonej pozycji; wypisuje postęp najwyżej co 3 sekundy i na koniec */
export function progress(total, label) {
  const start = Date.now();
  let done = 0;
  let shown = 0;
  return {
    tick(extra = "") {
      done++;
      const now = Date.now();
      if (now - shown < 3000 && done < total) return;
      shown = now;
      const pct = total ? ((done / total) * 100).toFixed(1) : "100";
      const perSecond = done / Math.max(1, (now - start) / 1000);
      const left = Math.round((total - done) / perSecond);
      console.log(`${label}: ${done}/${total} (${pct}%)${extra ? ` – ${extra}` : ""} – zostało ok. ${Math.floor(left / 60)} min ${left % 60} s`);
    },
  };
}

/** Częściowy wynik z poprzedniego, przerwanego uruchomienia (albo pusty) */
export const loadPartial = async (file) => JSON.parse(await readFile(file, "utf-8").catch(() => "{}"));

export async function savePartial(file, data) {
  await writeFile(`${file}.tmp`, JSON.stringify(data));
  await rename(`${file}.tmp`, file);
}

export const dropPartial = (file) => rm(file, { force: true });
