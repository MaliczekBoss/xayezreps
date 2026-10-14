import { readFile, rename, rm, writeFile } from "node:fs/promises";

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

export const loadPartial = async (file) => JSON.parse(await readFile(file, "utf-8").catch(() => "{}"));

export async function savePartial(file, data) {
  await writeFile(`${file}.tmp`, JSON.stringify(data));
  await rename(`${file}.tmp`, file);
}

export const dropPartial = (file) => rm(file, { force: true });
