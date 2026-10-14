import Link from "next/link";
import { ArrowUpRight, LogOut, ShieldOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout, logoutEverywhere } from "./actions";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-8 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:gap-4 sm:px-6">
      <Link href="/" className="shrink-0">
        <Logo />
      </Link>
      <span className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium">Statystyki</span>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-9 items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 text-sm text-muted hover:text-fg sm:inline-flex"
        >
          Zobacz stronę
          <ArrowUpRight aria-hidden size={14} />
        </a>
        <form action={logoutEverywhere}>
          <button
            type="submit"
            title="Unieważnia sesje admina na wszystkich urządzeniach"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-card hover:text-fg"
          >
            <ShieldOff aria-hidden size={15} />
            <span className="hidden sm:inline">Wyloguj wszędzie</span>
          </button>
        </form>
        <form action={logout}>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-card hover:text-fg">
            <LogOut aria-hidden size={15} />
            <span className="hidden sm:inline">Wyloguj</span>
          </button>
        </form>
      </div>
    </header>
  );
}
