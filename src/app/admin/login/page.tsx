import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { totpEnabled } from "@/lib/auth-token";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-[24rem]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-card p-7 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.06),transparent)]" />
          <h1 className="relative text-2xl font-semibold tracking-[-0.03em]">
            Panel <span className="fancy text-[1.12em] text-muted">admina</span>
          </h1>
          <p className="relative mt-1.5 text-sm text-muted">Zaloguj się, żeby zobaczyć statystyki.</p>
          <Suspense fallback={<div className="mt-6 h-[8.5rem]" />}>
            <Form />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-dim">
          <Link href="/" className="hover:text-fg">
            Wróć na stronę główną
          </Link>
        </p>
      </div>
    </main>
  );
}

async function Form() {
  await connection();
  return <LoginForm twoFactor={totpEnabled()} />;
}
