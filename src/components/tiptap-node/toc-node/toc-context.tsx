import { createContext, useContext } from "react";
import type { ID } from "src/types";

export interface TocItem {
  id: string;
  level: number;
  textContent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node?: any;
}

interface TocActions {
  setTocContent: (items: TocItem[]) => void;
  setActiveId: (id: ID | null) => void;
  navigateToHeading: (item: TocItem, topOffset?: number) => void;
  normalizeDepths: (items: TocItem[]) => number[];
  showTocContent: () => void;
  hideTocContent: () => void;
}

interface TocContentValue {
  tocContent: TocItem[];
}

interface TocUIStateValue {
  activeId: ID | null;
  open: boolean;
}

// ── Actions: NEVER change. Memoized [], no consumer re-renders from these. ──
export const TocActionsContext = createContext<TocActions | null>(null);

// ── Content: changes when headings change (editing) — infrequent. ──
export const TocContentContext = createContext<TocContentValue | null>(null);

// ── Active/open: changes on scroll and toggle — frequent. ──
export const TocUIStateContext = createContext<TocUIStateValue | null>(null);

export function useTocActions() {
  const ctx = useContext(TocActionsContext);
  if (!ctx) throw new Error("useTocActions outside TocProvider");
  return ctx;
}
export function useTocContent() {
  const ctx = useContext(TocContentContext);
  if (!ctx) throw new Error("useTocContent outside TocProvider");
  return ctx;
}
export function useTocUIState() {
  const ctx = useContext(TocUIStateContext);
  if (!ctx) throw new Error("useTocUIState outside TocProvider");
  return ctx;
}
