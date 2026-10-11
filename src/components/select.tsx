"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Nazwa pola, gdy lista jest częścią formularza */
  name?: string;
  /** "pill" w filtrach strony, "field" w formularzach */
  look?: "pill" | "field";
  className?: string;
};

const looks = {
  pill: "rounded-full bg-card pl-4 pr-3",
  field: "rounded-xl bg-bg pl-3.5 pr-3",
};

/** Rozwijana lista w stylu strony (zamiast systemowego <select>), obsługiwana też klawiaturą */
export function Select({ label, value, options, onChange, name, look = "pill", className = "" }: SelectProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = () => {
    setActive(selected);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const choose = (i: number) => {
    if (options[i].value !== value) onChange(options[i].value);
    close();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
    };
    if (moves[e.key]) {
      e.preventDefault();
      setActive(moves[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className={`flex h-11 w-full items-center justify-between gap-3 border text-sm text-fg transition-colors ${looks[look]} ${
          open ? "border-line-strong" : "border-line hover:border-line-strong"
        }`}
      >
        <span id={`${id}-value`} className="truncate">
          {options[selected]?.label}
        </span>
        <ChevronDown aria-hidden size={16} className={`shrink-0 text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.375rem)] z-30 min-w-full rounded-2xl border border-line-strong bg-[#141821] p-1.5 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.9)] focus:outline-none"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-6 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  i === active ? "bg-white/[0.07] text-fg" : "text-muted"
                }`}
              >
                {o.label}
                {i === selected && <Check aria-hidden size={15} className="text-brand-bright" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
