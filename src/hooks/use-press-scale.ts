import { useEffect, useState } from "react";
import type { CSSProperties, PointerEventHandler } from "react";

export interface UsePressScaleOptions {
  /** Scale applied on hover. Default 1.04. */
  hover?: number;
  /** Scale applied while pressed. Default 0.94. */
  press?: number;
  /** Transition duration in seconds. Default 0.15. */
  duration?: number;
  /** Transition timing function. */
  easing?: string;
  /** When true, the hook is a no-op (no transform, no transition). */
  disabled?: boolean;
}

export interface UsePressScaleResult {
  /** Spread onto the element you want to animate (e.g. a wrapper span). */
  handlers: {
    onPointerEnter: PointerEventHandler<HTMLElement>;
    onPointerLeave: PointerEventHandler<HTMLElement>;
    onPointerDown: PointerEventHandler<HTMLElement>;
    onPointerUp: PointerEventHandler<HTMLElement>;
    onPointerCancel: PointerEventHandler<HTMLElement>;
  };
  /** Merge into that same element's style. */
  style: CSSProperties;
}

type Phase = "idle" | "hover" | "press";

function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function usePressScale(
  options: UsePressScaleOptions = {},
): UsePressScaleResult {
  const {
    hover = 1.04,
    press = 0.97,
    duration = 0.15,
    easing = "cubic-bezier(0.2, 0.8, 0.2, 1)",
    disabled = false,
  } = options;

  const [phase, setPhase] = useState<Phase>("idle");
  const reduceMotion = usePrefersReducedMotion();
  const inert = disabled || reduceMotion;

  const scale = phase === "press" ? press : phase === "hover" ? hover : 1;

  const style: CSSProperties = inert
    ? {}
    : {
        transform: `scale(${scale})`,
        transition: `transform ${duration}s ${easing}`,
      };

  const handlers: UsePressScaleResult["handlers"] = {
    onPointerEnter: () => setPhase("hover"),
    onPointerLeave: () => setPhase("idle"),
    onPointerDown: () => setPhase("press"),
    onPointerUp: () => setPhase("hover"),
    onPointerCancel: () => setPhase("idle"),
  };

  return { handlers, style };
}
