import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { RatesProvider } from "@/lib/rates";
import { getRates } from "@/lib/remote";
import { site } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "xayezreps.pl – najlepsza strona do zamawiania z Chin",
    template: "%s – xayezreps.pl",
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "/",
    siteName: site.name,
    title: "xayezreps.pl – sprawdzone findy i kalkulator paczki",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "xayezreps.pl – sprawdzone findy i kalkulator paczki",
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const rates = await getRates();
  return (
    <html lang="pl" className={`${geist.variable} ${instrument.variable} ${geistMono.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <a
          href="#findy"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-5 focus:py-2.5 focus:font-semibold focus:text-black"
        >
          Przejdź do findów
        </a>
        {/* Tło całej strony: kropki przytwierdzone do ekranu i miękkie niebieskie poświaty */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,#000_25%,transparent_80%)]" />
          <div className="absolute -top-56 left-1/2 h-[38rem] w-[72rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.16),transparent)]" />
          <div className="absolute -left-56 top-[40%] size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(29_78_216/0.12),transparent)]" />
          <div className="absolute -right-48 bottom-[-8rem] size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(96_165_250/0.09),transparent)]" />
        </div>
        <RatesProvider rates={rates}>{children}</RatesProvider>
      </body>
    </html>
  );
}
