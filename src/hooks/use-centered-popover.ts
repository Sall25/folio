import * as React from "react";

/**
 * Aligns a downward-opening popover so that a *target row inside the content*
 * (e.g. the name input) is vertically centered on the trigger.
 *
 * Assumes the PopoverContent uses side="bottom". Self-calibrating: it measures
 * the real rendered geometry, so there are no hand-tuned padding constants.
 *
 * Usage:
 *   const { triggerRef, targetRef, sideOffset } =
 *     useCenteredPopover<HTMLButtonElement, HTMLInputElement>(open);
 *
 *   <PopoverTrigger asChild><Button ref={triggerRef} /></PopoverTrigger>
 *   <PopoverContent side="bottom" align="start" sideOffset={sideOffset}>
 *     <Input ref={targetRef} />
 *   </PopoverContent>
 */
export function useCenteredPopover<
  T extends HTMLElement = HTMLElement,
  G extends HTMLElement = HTMLElement,
>(open: boolean) {
  const triggerRef = React.useRef<T | null>(null);
  const targetRef = React.useRef<G | null>(null);
  const [sideOffset, setSideOffset] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!open) {
      setSideOffset(0); // recalibrate on next open
      return;
    }
    const trigger = triggerRef.current;
    const target = targetRef.current;
    if (!trigger || !target) return;

    const t = trigger.getBoundingClientRect();
    const g = target.getBoundingClientRect();

    // With side="bottom", content top === trigger.bottom + current sideOffset.
    // The target's distance from content top is invariant to that offset, so we
    // can recover it regardless of what sideOffset is applied right now.
    const contentTop = t.bottom + sideOffset;
    const targetCenterFromTop = g.top + g.height / 2 - contentTop;

    // Lift content so target center lands on trigger center.
    const next = -(t.height / 2 + targetCenterFromTop);

    // Guard stops the layout loop; because the distance is invariant this
    // converges in a single re-render.
    if (Math.abs(next - sideOffset) > 0.5) setSideOffset(next);
  }, [open, sideOffset]);

  return { triggerRef, targetRef, sideOffset };
}
