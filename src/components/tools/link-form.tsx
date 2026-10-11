"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ClipboardPaste, X } from "lucide-react";
import { useFormat } from "@/lib/use-format";

type LinkFormProps = {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  icon: ReactNode;
  /** Dodatkowe sprawdzenie przed wysłaniem; zwraca komunikat błędu albo null */
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  inputMode?: "url" | "text";
};

/** Pole do wklejenia linku albo numeru z przyciskiem „Wklej” i wysyłką */
export function LinkForm({ id, label, placeholder, submitLabel, defaultValue = "", icon, validate, onSubmit, inputMode = "url" }: LinkFormProps) {
  const { t } = useFormat();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const submit = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const problem = validate?.(v) ?? null;
    setError(problem);
    if (!problem) onSubmit(v);
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;
      setValue(text);
      submit(text);
    } catch {
      document.getElementById(id)?.focus();
    }
  };

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`flex flex-col gap-2 rounded-[1.75rem] border bg-card p-2 transition-colors focus-within:border-line-strong sm:flex-row sm:items-center sm:rounded-full ${
          error ? "border-amber-300/60" : "border-line"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-3">
          <span className="shrink-0 text-dim">{icon}</span>
          <input
            id={id}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            inputMode={inputMode}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-fg placeholder:text-dim focus:outline-none"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setError(null);
                document.getElementById(id)?.focus();
              }}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-fg"
            >
              <X aria-hidden size={16} />
              <span className="sr-only">{t("tool.clear")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={paste}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:bg-bg hover:text-fg"
            >
              <ClipboardPaste aria-hidden size={15} />
              {t("tool.paste")}
            </button>
          )}
        </div>
        <button type="submit" className="h-11 shrink-0 rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-bright">
          {submitLabel}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-3 pl-4 text-sm text-amber-300">
          {error}
        </p>
      )}
    </form>
  );
}
