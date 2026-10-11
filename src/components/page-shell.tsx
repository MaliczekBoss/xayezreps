import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Wspólny układ podstron: wyspa u góry, treść, stopka */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 pb-10 pt-28 sm:px-6 sm:pt-36">{children}</main>
      <SiteFooter />
    </>
  );
}
