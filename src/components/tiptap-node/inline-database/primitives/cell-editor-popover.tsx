import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCurrentEditor } from "@tiptap/react";
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
  /** Minimum height of the floating editor box. */
  minHeight?: number | string;
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
  minHeight,
  open: controlledOpen,
  onOpenChange,
}: CellEditorPopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const { editor } = useCurrentEditor();
  const rootRef = useRef<HTMLDivElement>(null);

  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

  // Sync the active-cell decoration with edit state. Runs AFTER render (effect),
  // so reading rootRef here is safe — never in the render path.
  //   open  → clear the ring (the open editor box is signal enough)
  //   close → restore the ring on this cell (Notion resting "selected" state)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (open) {
      editor.commands.clearActiveCell();
      return;
    }

    const el = rootRef.current;
    if (!el) return;
    const pos = editor.view.posAtDOM(el, 0);
    if (pos < 0) return;
    const $pos = editor.state.doc.resolve(pos);
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === "databaseCell") {
        editor.commands.setActiveCell($pos.before(depth));
        return;
      }
    }
  }, [open, editor]);

  if (readonly) {
    return <div className="db-cell-editor__display">{trigger}</div>;
  }

  // Not editing → a plain div, NO Radix Popover. This is the common case (every
  // cell that isn't currently being edited). Mounting a full Radix Popover per
  // cell — hundreds per table — leaked its dismiss-layer listeners and portal
  // DOM when ProseMirror destroyed the cell node views (the detached-DOM leak),
  // and was pure render/memory overhead. The Popover now exists ONLY for the one
  // cell actually open for editing.
  if (!open) {
    return (
      <div
        ref={rootRef}
        className="db-cell-editor__display"
        role="button"
        tabIndex={0}
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
    );
  }

  // Editing → mount the Radix Popover (defaultOpen so it opens immediately).
  return (
    <Popover open onOpenChange={setOpen} defaultOpen>
      <PopoverTrigger asChild>
        <div
          ref={rootRef}
          className="db-cell-editor__display"
          data-editing="true"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
        >
          {trigger}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={-38}
        alignOffset={-2}
        avoidCollisions={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        className="db-cell-editor__popover"
        style={{
          width: width ?? "calc(var(--radix-popover-trigger-width) + 4px)",
          minWidth: "var(--radix-popover-trigger-width)",
          minHeight:
            minHeight ?? "calc(var(--radix-popover-trigger-height) + 4px)",
        }}
      >
        <div className="db-cell-editor__box">
          {children(() => setOpen(false))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
