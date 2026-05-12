// use-peek-page.tsx
import { createContext, useContext } from "react";

interface PeekPageContextValue {
  peekPageId: number | null;
  setPeekPageId: (id: number | null) => void;
}

export const PeekPageContext = createContext<PeekPageContextValue | null>(null);

export function usePeekPage() {
  const ctx = useContext(PeekPageContext);
  if (!ctx) throw new Error("usePeekPage must be used inside PeekPageProvider");
  return ctx;
}
