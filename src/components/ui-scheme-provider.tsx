"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parseUiScheme, UI_SCHEME_KEY, type UiScheme } from "@/lib/ui-scheme";

type Ctx = { scheme: UiScheme; setScheme: (next: UiScheme) => void; ready: boolean };

const UiSchemeContext = createContext<Ctx>({
  scheme: "office",
  setScheme: () => {},
  ready: false,
});

function applyDom(scheme: UiScheme) {
  document.documentElement.dataset.ui = scheme;
}

export function UiSchemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<UiScheme>("office");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = parseUiScheme(window.localStorage.getItem(UI_SCHEME_KEY));
    setSchemeState(next);
    applyDom(next);
    setReady(true);
  }, []);

  const setScheme = useCallback((next: UiScheme) => {
    setSchemeState(next);
    window.localStorage.setItem(UI_SCHEME_KEY, next);
    applyDom(next);
  }, []);

  const value = useMemo(() => ({ scheme, setScheme, ready }), [scheme, setScheme, ready]);
  return <UiSchemeContext.Provider value={value}>{children}</UiSchemeContext.Provider>;
}

export function useUiScheme() {
  return useContext(UiSchemeContext);
}
