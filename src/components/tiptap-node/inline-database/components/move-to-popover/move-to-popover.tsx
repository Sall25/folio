/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── MoveToPopover ──────────────────────────────────────────────────────────
// The "Move to" destination picker as a popover anchored to the ••• button —
// the same treatment as IconPickerPopover and PropertyEditorPopover. Picking
// "Move to" in the actions menu closes the menu and opens this in its place
// (both anchor to the stable ••• trigger). Wraps the existing MoveToPanel
// content (search + destination list from usePages).
import type { RefObject } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";
import { MoveToPanel } from "../move-to-panel";
import type { ID } from "src/types";

export function MoveToPopover({
  currentPageId,
  anchorRef,
  open,
  onOpenChange,
  onMove,
  spaceName,
  container,
}: {
  currentPageId: ID;
  /** Anchor the picker to this element (the ••• button). */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Move the record's page under newParentId (null = top-level section). */
  onMove: (newParentId: ID | null, category?: string) => void;
  spaceName?: string;
  container?: HTMLElement | null;
}) {
  const portalContainer =
    container ??
    (typeof document !== "undefined" ? document.getElementById("root") : null);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={anchorRef as any} />
      <PopoverPortal container={portalContainer}>
        <PopoverContent
          side="bottom"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ position: "fixed", zIndex: 999 }}
          className="db-move-to__popover"
        >
          <MoveToPanel
            currentPageId={currentPageId}
            onMove={(newParentId, category) => {
              onMove(newParentId, category);
              onOpenChange(false);
            }}
            onBack={() => onOpenChange(false)}
            spaceName={spaceName}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
