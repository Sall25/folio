import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import "./cell-editor-popover.scss";

export interface CellEditorPopoverProps {
  /** The cell's plain-text display (the trigger). */
  trigger: ReactNode;
  /** The editor shown inside the floating box. */
  children: (close: () => void) => ReactNode;
  readonly?: boolean;
  /** Width of the floating editor box. */
  width?: number | string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Notion-style cell editor: the cell shows plain text; clicking opens a small
 * floating bordered box anchored over the cell. Reusable across cell types.
 */
export function CellEditorPopover({
  trigger,
  children,
  readonly,
  width,
  open: controlledOpen,
  onOpenChange,
}: CellEditorPopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(false);

  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  console.log("[popover] open =", open);

  if (readonly) {
    return <div className="db-cell-editor__display">{trigger}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="db-cell-editor__display"
          role="button"
          tabIndex={0}
          // Radix's trigger binds on POINTERDOWN, which ProseMirror suppresses
          // inside a contentEditable=false NodeView — so the popover never opened
          // in the record-property panel (while the checkbox, a plain onClick,
          // worked fine). Opening from onClick sidesteps PM entirely.
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {trigger}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={-36}
        alignOffset={-4}
        avoidCollisions={false}
        // ProseMirror handles the same pointerdown that Radix's dismiss layer
        // watches, and inside a contentEditable=false NodeView that reads as an
        // "outside" interaction — so the popover opened and closed on the same
        // click. Refusing the auto-dismiss on those two events keeps it open.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        className="db-cell-editor__popover"
        style={{
          // Match the cell's width by default — Radix publishes the trigger's
          // size as a custom property, so the box lines up with the column
          // instead of being an arbitrary fixed width. A caller can still
          // override with an explicit `width` where a wider box makes sense.
          width: width ?? "calc(var(--radix-popover-trigger-width) + 8px)",
          minWidth: "var(--radix-popover-trigger-width)",
        }}
      >
        <div className="db-cell-editor__box">
          {children(() => setOpen(false))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
