"use client";

import { createContext, use, useEffect, type ReactNode } from "react";
import { FALLBACK_RATES, type Rates } from "./money";

const RatesContext = createContext<Rates>(FALLBACK_RATES);

let liveRates: Rates = FALLBACK_RATES;
export const getLiveRates = () => liveRates;

export function RatesProvider({ rates, children }: { rates: Rates; children: ReactNode }) {
  useEffect(() => {
    liveRates = rates;
  }, [rates]);
  return <RatesContext value={rates}>{children}</RatesContext>;
}

export const useRates = () => use(RatesContext);
