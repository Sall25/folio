import { useCallback } from "react";
import { useLocalStorage } from "../../../hooks/use-local-storage";

export const RECENT_DEFAULT = 15;
export const RECENT_MIN = 5;
export const RECENT_MAX = 50;
const STEP = 5;

const clamp = (n: number) =>
  Math.min(RECENT_MAX, Math.max(RECENT_MIN, Math.round(n)));

/** How many pages the sidebar's Recent section shows (this device). */
export function useRecentLimit() {
  const [stored, setStored] = useLocalStorage<number>(
    "folio:recent-limit",
    RECENT_DEFAULT,
  );
  const limit = clamp(stored);
  const more = useCallback(
    () => setStored((n) => clamp(n + STEP)),
    [setStored],
  );
  const less = useCallback(
    () => setStored((n) => clamp(n - STEP)),
    [setStored],
  );
  return { limit, more, less };
}
