"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { login, type FormState } from "../actions";

export function LoginForm({ twoFactor = false }: { twoFactor?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="relative mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Hasło
        </label>
        <div className="mt-2 flex h-12 items-center gap-2.5 rounded-xl border border-line bg-bg px-4 focus-within:border-line-strong">
          <Lock aria-hidden size={16} className="shrink-0 text-dim" />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(state.error) || undefined}
            aria-describedby={state.error ? "login-error" : undefined}
            className="h-full w-full bg-transparent text-fg focus:outline-none"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="text-dim hover:text-fg">
            {show ? <EyeOff aria-hidden size={17} /> : <Eye aria-hidden size={17} />}
            <span className="sr-only">{show ? "Ukryj hasło" : "Pokaż hasło"}</span>
          </button>
        </div>
      </div>

      {twoFactor && (
        <div>
          <label htmlFor="code" className="text-sm font-medium">
            Kod z aplikacji (2FA)
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-4 font-mono tracking-[0.3em] text-fg focus:border-line-strong focus:outline-none"
          />
        </div>
      )}

      {state.error && (
        <p id="login-error" role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-fg font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
      >
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>
    </form>
  );
}
