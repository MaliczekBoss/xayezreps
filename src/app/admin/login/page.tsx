import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-[24rem]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-card p-7 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.3),transparent)]" />
          <h1 className="relative text-2xl font-semibold tracking-[-0.03em]">
            Panel <span className="fancy text-[1.12em] text-brand-bright">admina</span>
          </h1>
          <p className="relative mt-1.5 text-sm text-muted">Zaloguj się, żeby dodawać i edytować itemy.</p>
          <LoginForm />
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
