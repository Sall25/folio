import {
  useState,
  type ReactNode,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { IconPickerCard } from "./icon-picker-card";
import type { Target } from "./types";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

/**
 * Drop-in icon picker: wrap any trigger and get the full picker in a popover,
 * with open + tab state managed for you.
 *
 *   <IconPickerPopover onSelect={pick} onRemove={remove}>
 *     <Button variant="ghost">{icon}</Button>
 *   </IconPickerPopover>
 *
 * TWO anchoring modes:
 *
 *  - TRIGGER (default): pass `children` — the picker opens when the child is
 *    clicked and positions against it. This is the original behaviour.
 *
 *  - EXTERNAL ANCHOR: pass `anchorRef` (and no children) — the picker is opened
 *    PROGRAMMATICALLY (via `open`) and positions against `anchorRef.current`
 *    instead of a trigger it owns. Use this when another control opens the
 *    picker at a shared position — e.g. a card's ••• menu closes and the icon
 *    picker opens in the menu's place, anchored to the ••• button. The button
 *    doesn't unmount when the menu closes, so the picker keeps a stable anchor.
 *
 * The active tab is reported as the 3rd arg of onSelect, so consumers never need
 * to own `target` themselves. Existing IconPickerCard callers are untouched.
 */
export function IconPickerPopover({
  children,
  anchorRef,
  onSelect,
  onRemove,
  defaultTarget = "Emoji",
  closeOnSelect = true,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "start",
  sideOffset,
  container,
  contentStyle,
}: {
  /** The trigger element (trigger mode). Omit when using `anchorRef`. */
  children?: ReactNode;
  /** Anchor the picker to an existing element instead of a trigger child. When
   *  set, the picker is opened programmatically via `open`; positioning follows
   *  this element. */
  anchorRef?: RefObject<HTMLElement | null>;
  onSelect: (name: string, color?: string, target?: Target) => void;
  onRemove?: () => void;
  defaultTarget?: Target;
  closeOnSelect?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  container?: HTMLElement | null;
  contentStyle?: CSSProperties;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [target, setTarget] = useState<Target>(defaultTarget);

  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const portalContainer =
    container ??
    (typeof document !== "undefined" ? document.getElementById("root") : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {anchorRef ? (
        // External-anchor mode: position against anchorRef, no trigger child.
        // (Radix PopoverAnchor accepts a virtualRef; the popover opens via
        // `open` and follows the referenced element.)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PopoverAnchor key={"popover-anchor"} virtualRef={anchorRef as any} />
      ) : (
        <PopoverTrigger key={"popover-trigger"} asChild>
          {children}
        </PopoverTrigger>
      )}
      <PopoverPortal container={portalContainer}>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          style={{ position: "fixed", zIndex: 999, ...contentStyle }}
        >
          <IconPickerCard
            target={target}
            onTargetChange={setTarget}
            onSelect={(name, color, t) => {
              onSelect(name, color, t);
              if (closeOnSelect) setOpen(false);
            }}
            onRemove={
              onRemove
                ? () => {
                    onRemove();
                    setOpen(false);
                  }
                : undefined
            }
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
