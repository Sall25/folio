import { useEffect, useState } from "react";

// ─── usePanelTransition ─────────────────────────────────────────────────────
// Briefly flags a "transitioning" state when the panel key changes, so the
// view-options popover can show a spinner during a panel swap. With
// `includeInitial`, it also fires on the FIRST render — smoothing the tiny beat
// as the popover opens onto its main panel (e.g. from Rename / Edit view).
//
// Uses the documented "store previous value in state + adjust state during
// render" pattern (no ref reads during render, no setState inside an effect
// body). The effect only runs the clear-timer.
export function usePanelTransition(
  panelKey: string,
  duration = 180,
  includeInitial = false,
): boolean {
  // Seed prevKey so the first render is a "change" only when includeInitial.
  const [prevKey, setPrevKey] = useState<string | null>(
    includeInitial ? null : panelKey,
  );
  const [transitioning, setTransitioning] = useState(includeInitial);

  if (prevKey !== panelKey) {
    setPrevKey(panelKey);
    setTransitioning(true);
  }

  useEffect(() => {
    if (!transitioning) return;
    const t = window.setTimeout(() => setTransitioning(false), duration);
    return () => window.clearTimeout(t);
  }, [panelKey, duration, transitioning]);

  return transitioning;
}
