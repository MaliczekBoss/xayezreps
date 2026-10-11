"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Copy,
  Menu,
  Search,
  Settings2,
  ShoppingBag,
  Trash,
  TriangleAlert,
  Truck,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { DiscordIcon } from "./discord-icon";
import { Logo } from "./logo";
import { SettingsModal } from "./settings-modal";
import { parseSource } from "@/lib/agents";
import { summarize, useHaul } from "@/lib/haul";
import { notify, onNotify, type IslandNotice, type NoticeIcon } from "@/lib/notify";
import { site } from "@/lib/site";
import { useFormat } from "@/lib/use-format";

const icons: Record<NoticeIcon, LucideIcon> = {
  copy: Copy,
  remove: Trash,
  truck: Truck,
  alert: TriangleAlert,
  undo: Undo2,
};

const toneText: Record<NonNullable<IslandNotice["tone"]>, string> = {
  brand: "text-brand-bright",
  success: "text-gl",
  neutral: "text-muted",
  warning: "text-amber-300",
};

/**
 * Dynamiczna wyspa: na górze strony szeroki pasek z pełnym menu,
 * po przewinięciu kurczy się do zwartej pigułki. Każde powiadomienie
 * strony (paczka, kopiowanie, ustawienia) rozwija ją na chwilę.
 */
export function SiteHeader() {
  const f = useFormat();
  const { t } = f;
  const router = useRouter();
  const haul = useHaul();
  const summary = summarize(haul);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const reduce = useReducedMotion();
  const menuButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const links = [
    { href: site.routes.finds, label: t("nav.browse") },
    { href: site.routes.qcFinder, label: t("nav.qc") },
    { href: site.routes.tools, label: t("nav.tools") },
    { href: site.routes.sellers, label: t("nav.sellers") },
    { href: site.routes.tutorial, label: t("nav.guide") },
  ];

  useEffect(() => {
    document.documentElement.lang = f.settings.lang;
  }, [f.settings.lang]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const schedule = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), ms);
  };

  useEffect(() => {
    const off = onNotify((n) => {
      setNotice(n);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setNotice(null), n.duration ?? (n.action?.onClick ? 5000 : 2800));
    });
    return () => {
      off();
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
    if (!value) return;
    const source = parseSource(value);
    if (source) {
      window.open(f.buyUrl(source), "_blank", "noopener");
      notify({ tone: "brand", image: f.agent.logo, title: t("n.converted", { agent: f.agent.name }), text: t("n.convertedText") });
    } else if (/^https?:\/\//i.test(value)) {
      router.push(`${site.routes.qcFinder}?url=${encodeURIComponent(value)}`);
    } else {
      router.push(`${site.routes.finds}?q=${encodeURIComponent(value)}`);
    }
  };

  const compact = scrolled && !open;
  const expandTransition = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };
  const NoticeIconCmp = notice?.icon ? icons[notice.icon] : null;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
        <div
          onMouseEnter={() => notice && window.clearTimeout(timer.current)}
          onMouseLeave={() => notice && schedule(1600)}
          className={`pointer-events-auto w-full overflow-hidden rounded-[28px] border backdrop-blur-xl transition-[max-width,background-color,border-color,box-shadow] duration-500 ease-[var(--ease-out-soft)] ${
            compact
              ? // Na komputerze zwarta wyspa musi zmieścić logo, 4 linki, ustawienia i paczkę – także z powiadomieniem
                `${notice ? "max-w-[36rem] lg:max-w-[60rem] xl:max-w-[63.5rem]" : "max-w-[22rem] md:max-w-[25rem] lg:max-w-[60rem] xl:max-w-[63.5rem]"} border-line-strong bg-[#141416]/92 shadow-[0_16px_40px_-14px_rgb(0_0_0/0.9)]`
              : "max-w-[76rem] border-line bg-card/80"
          }`}
        >
          <div className="flex h-14 items-center gap-4 pl-4 pr-2 sm:pl-5">
            <Link href="/" aria-label={t("header.home")} className="shrink-0 rounded-md">
              <Logo />
            </Link>

            <nav aria-label="Menu" className="mx-auto hidden lg:block">
              <ul className="flex items-center gap-0.5 text-sm font-medium">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`whitespace-nowrap rounded-full py-2 text-muted transition-[padding,color,background-color] duration-500 hover:bg-white/[0.06] hover:text-fg ${
                        compact ? "px-2.5" : "px-3 xl:px-3.5"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Szukajka chowa się, gdy wyspa jest zwarta */}
            <form
              role="search"
              onSubmit={onSearch}
              className={`hidden overflow-hidden transition-[width,opacity] duration-500 ease-[var(--ease-out-soft)] md:block lg:hidden xl:block ${
                compact ? "w-0 opacity-0" : "ml-auto w-52 opacity-100 lg:ml-0"
              }`}
              aria-hidden={compact || undefined}
            >
              <label htmlFor="szukaj-gora" className="sr-only">
                {t("header.searchLabel")}
              </label>
              <div className="flex h-10 w-52 items-center gap-2 rounded-full border border-line bg-bg/80 px-3.5 focus-within:border-line-strong">
                <Search aria-hidden size={15} className="shrink-0 text-dim" />
                <input
                  id="szukaj-gora"
                  name="q"
                  tabIndex={compact ? -1 : undefined}
                  placeholder={t("header.search")}
                  autoComplete="off"
                  className="h-full w-full min-w-0 bg-transparent text-sm text-fg placeholder:text-dim focus:outline-none"
                />
              </div>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
              {/* Między lg a xl nie ma miejsca na pole wyszukiwania, więc zostaje ikona */}
              <Link
                href={site.routes.finds}
                className={`size-10 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-fg ${compact ? "hidden" : "hidden lg:grid xl:hidden"}`}
                title={t("header.searchLabel")}
              >
                <Search aria-hidden size={18} />
                <span className="sr-only">{t("header.searchLabel")}</span>
              </Link>
              <a
                href={site.socials.discord}
                target="_blank"
                rel="noopener noreferrer"
                className={`size-10 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-fg ${compact ? "hidden" : "hidden md:grid"}`}
                title={t("nav.discord")}
              >
                <DiscordIcon />
                <span className="sr-only">{t("nav.discord")}</span>
              </a>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                title={t("header.settings")}
              >
                <Settings2 aria-hidden size={18} />
                <span className="sr-only">{t("header.settings")}</span>
              </button>
              <Link
                href={site.routes.shipCalculator}
                className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-bg/80 pl-3.5 pr-1.5 text-sm font-medium transition-colors hover:border-line-strong"
              >
                <ShoppingBag aria-hidden size={16} />
                <span className="hidden sm:inline">{t("header.haul")}</span>
                <span className="sr-only">: {summary.count === 0 ? t("header.haulEmpty") : f.pieces(summary.count)}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={summary.count}
                    aria-hidden="true"
                    initial={reduce ? false : { y: -12, opacity: 0, scale: 0.6 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { y: 12, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 520, damping: 26 }}
                    className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 font-mono text-xs font-semibold tabular ${
                      summary.count > 0 ? "bg-brand text-white" : "bg-card text-dim"
                    }`}
                  >
                    {summary.count}
                  </motion.span>
                </AnimatePresence>
              </Link>
              <button
                ref={menuButton}
                type="button"
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-fg lg:hidden"
                aria-expanded={open}
                aria-controls="menu-mobile"
                onClick={() => setOpen((o) => !o)}
              >
                {open ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
                <span className="sr-only">{open ? t("header.closeMenu") : t("header.openMenu")}</span>
              </button>
            </div>
          </div>

          {/* Rozwinięcie wyspy: powiadomienie */}
          <AnimatePresence initial={false} mode="wait">
            {notice && !open && (
              <motion.div
                key={notice.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={expandTransition}
              >
                <div className="flex items-center gap-3 px-3 pb-3 pt-0.5">
                  {notice.image ? (
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-line bg-bg">
                      <Image src={notice.image} alt="" fill sizes="2.5rem" className="object-cover" />
                    </span>
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-bg text-muted">
                      {NoticeIconCmp && <NoticeIconCmp aria-hidden size={17} />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-xs font-medium ${toneText[notice.tone ?? "brand"]}`}>{notice.title}</span>
                    {notice.text && <span className="block truncate text-sm font-medium">{notice.text}</span>}
                  </span>
                  {notice.action &&
                    (notice.action.href ? (
                      <a
                        href={notice.action.href}
                        onClick={() => setNotice(null)}
                        className="shrink-0 rounded-full bg-fg px-3.5 py-2 text-xs font-semibold text-bg hover:bg-white"
                      >
                        {notice.action.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          notice.action?.onClick?.();
                        }}
                        className="shrink-0 rounded-full border border-line-strong bg-bg px-3.5 py-2 text-xs font-semibold hover:border-brand hover:text-brand-bright"
                      >
                        {notice.action.label}
                      </button>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rozwinięcie wyspy: menu na telefonie */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.nav
                id="menu-mobile"
                aria-label="Menu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={expandTransition}
                className="lg:hidden"
              >
                <ul className="border-t border-line p-2">
                  {[...links, { href: site.socials.discord, label: t("nav.discord") }].map((l) => {
                    const external = l.href.startsWith("http");
                    return (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          onClick={() => setOpen(false)}
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="block rounded-2xl px-3 py-3 font-medium hover:bg-white/[0.06]"
                        >
                          {l.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>

        {/* Czytniki ekranu słyszą każde powiadomienie */}
        <p className="sr-only" aria-live="polite">
          {notice ? `${notice.title}. ${notice.text ?? ""}` : ""}
        </p>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
