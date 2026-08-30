// ─── NavigableMenuItem ──────────────────────────────────────────────────────
// A menu row whose submenu opens as a side FLYOUT (to the right), with standard
// nested-menu hover behaviour:
//
//   - Hovering the item opens its flyout.
//   - Leaving the item schedules a close — but entering the flyout cancels it,
//     so moving from the item across the small gap into the flyout keeps it open
//     ("unless the mouse is on this one"). Leaving BOTH the item and the flyout
//     lets the close fire.
//   - Hovering a sibling navigable item opens that one; this one closes once the
//     mouse has left it (its timer fires and nothing re-enters).
//   - Clicking the item toggles it too (so it works without hover, e.g. touch).
//
// The delayed close + cancel-on-flyout-enter is the collision avoidance: the
// timer bridges the item→flyout gap without needing a literal safe-triangle.
//
// Each instance owns its own open-state + timer, so siblings hand off naturally.
// The submenu content is passed as children and rendered inside the flyout.
import { useRef, useState, type ReactNode } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";
import { MenuRow } from "src/components/tiptap-node/inline-database/components/menu-row";
import type { ComponentType } from "react";

const CLOSE_DELAY = 120; // ms — long enough to cross the item→flyout gap.
const OPEN_DELAY = 60; // ms — avoids opening on a quick pass-through.

export function NavigableMenuItem({
  Icon,
  label,
  shortcut,
  children,
  container,
}: {
  Icon: ComponentType<{ className?: string; size?: number }>;
  label: string;
  shortcut?: string;
  /** The submenu content shown in the flyout. */
  children: ReactNode;
  container?: HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = undefined;
    closeTimer.current = undefined;
  };

  const scheduleOpen = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
    if (open || openTimer.current) return;
    openTimer.current = window.setTimeout(() => {
      openTimer.current = undefined;
      setOpen(true);
    }, OPEN_DELAY);
  };

  const scheduleClose = () => {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
    if (closeTimer.current) return;
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      setOpen(false);
    }, CLOSE_DELAY);
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  };

  const portalContainer =
    container ??
    (typeof document !== "undefined" ? document.getElementById("root") : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onPointerEnter={scheduleOpen}
          onPointerLeave={scheduleClose}
          // Click also toggles (keyboard/touch, and immediate open on click).
          onClick={() => {
            clearTimers();
            setOpen((v) => !v);
          }}
        >
          <MenuRow Icon={Icon} label={label} shortcut={shortcut} navigable />
        </div>
      </PopoverAnchor>
      <PopoverPortal container={portalContainer}>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={4}
          // Mouse on the flyout → cancel the pending close ("on this one").
          // Leaving the flyout → schedule close (leaving both closes it).
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          // Don't steal focus / close on the interactions inside.
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ position: "fixed", zIndex: 999 }}
          className="db-actions-menu__flyout"
        >
          {children}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
