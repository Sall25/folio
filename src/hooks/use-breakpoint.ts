import { useSyncExternalStore } from "react";

// ── Breakpoint scale ─────────────────────────────────────────────────────────
// One place to tune the whole app's responsive behavior. Matched to common
// device classes; adjust to your design system if it differs.
export const BREAKPOINTS = {
  sm: 640, // large phone / small tablet portrait
  md: 768, // tablet portrait
  lg: 1024, // tablet landscape / small laptop
  xl: 1280, // desktop
  "2xl": 1536, // large desktop
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
type Mode = "min" | "max";

function queryFor(mode: Mode, px: number): string {
  // max is exclusive (< px) so min/max at the same breakpoint never overlap —
  // a viewport is either "min: N" or "max: N", never both.
  return mode === "min" ? `(min-width: ${px}px)` : `(max-width: ${px - 1}px)`;
}

// Server render has no window; treat as "no match" rather than crashing. The
// client corrects on hydration.
const isServer = typeof window === "undefined";

/**
 * Core matcher. Accepts a named breakpoint or a raw pixel number.
 *
 *   useMediaQuery("max", "md")   // < 768px
 *   useMediaQuery("min", "lg")   // >= 1024px
 *   useMediaQuery("max", 900)    // < 900px (escape hatch for one-offs)
 *
 * Uses useSyncExternalStore so the value is correct on the FIRST render — no
 * undefined-then-correct flash, and no effect needed to seed it.
 */
export function useMediaQuery(
  mode: Mode,
  breakpoint: Breakpoint | number,
): boolean {
  const px =
    typeof breakpoint === "number" ? breakpoint : BREAKPOINTS[breakpoint];
  const query = queryFor(mode, px);

  return useSyncExternalStore(
    (onChange) => {
      if (isServer) return () => {};
      const mql = window.matchMedia(query);
      // Safari < 14 lacks addEventListener on MediaQueryList; fall back.
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    () => (isServer ? false : window.matchMedia(query).matches),
    () => false, // server snapshot
  );
}

// ── Semantic helpers ─────────────────────────────────────────────────────────
// Components read intent, not pixels. "Is this a phone?" rather than "< 768?".

/** Phone: below the md (tablet) breakpoint. */
export function useIsMobile(): boolean {
  return useMediaQuery("max", "md");
}

/** Tablet: md up to lg — portrait tablets and small landscape. */
export function useIsTablet(): boolean {
  const aboveMobile = useMediaQuery("min", "md");
  const belowDesktop = useMediaQuery("max", "lg");
  return aboveMobile && belowDesktop;
}

/** Desktop: lg and up. */
export function useIsDesktop(): boolean {
  return useMediaQuery("min", "lg");
}

/**
 * The active breakpoint as a single label, for when a component needs to branch
 * three or more ways rather than a boolean. Returns the largest breakpoint the
 * viewport satisfies.
 *
 *   const bp = useBreakpoint();  // "sm" | "md" | "lg" | "xl" | "2xl" | "base"
 */
export function useBreakpoint(): Breakpoint | "base" {
  const sm = useMediaQuery("min", "sm");
  const md = useMediaQuery("min", "md");
  const lg = useMediaQuery("min", "lg");
  const xl = useMediaQuery("min", "xl");
  const xxl = useMediaQuery("min", "2xl");

  if (xxl) return "2xl";
  if (xl) return "xl";
  if (lg) return "lg";
  if (md) return "md";
  if (sm) return "sm";
  return "base";
}
