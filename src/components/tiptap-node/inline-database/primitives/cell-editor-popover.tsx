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
  width?: number;
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
  width = 320,
  open: controlledOpen,
  onOpenChange,
}: CellEditorPopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

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
        sideOffset={-30} // sit over the cell, not below it (~row height)
        alignOffset={-6} // line the box edge up with the cell edge
        avoidCollisions={false}
        className="db-cell-editor__popover"
        style={{ width }}
      >
        <div className="db-cell-editor__box">
          {children(() => setOpen(false))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
