import { useTableOverlays } from "./use-table-overlays";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Card } from "@/components/tiptap-ui-primitive/card";
import ColorDropdownMenu from "@/components/tiptap-ui/color-dropdown-menu";
import AlignmentDropdownMenu from "@/components/tiptap-ui/alignment-dropdown-menu";
import { TableClearRowColButton } from "../table-clear-row-column-button";
import { TableMergeOrSplitCellButton } from "../table-merge-split-cell-button";
import { useCallback, useState } from "react";

interface TableCellOverlayProps {
  className?: string;
}

export function TableCellOverlay({ className }: TableCellOverlayProps) {
  const { cellRect, cellPos } = useTableOverlays();
  const [open, setOpen] = useState(false);

  const onAction = useCallback(() => setOpen(false), []);

  if (cellPos === -1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          style={{
            position: "absolute",
            top: cellRect ? cellRect.top + cellRect.height / 3 : 0,
            left: cellRect ? cellRect?.left + cellRect.width - 8 : 0,
            zIndex: 20,
          }}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent>
        <Card
          style={{
            minWidth: "180px",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "5px 10px",
          }}
        >
          <TableMergeOrSplitCellButton onAction={onAction} />
          <ColorDropdownMenu hideWhenUnavailable={true} onAction={onAction} />
          <AlignmentDropdownMenu
            hideWhenUnavailable={true}
            onAction={onAction}
          />
          <TableClearRowColButton
            hideWhenUnavailable={true}
            text="Clear all contents"
            onAction={onAction}
          />
        </Card>
      </PopoverContent>
    </Popover>
    // <div
    //   style={{
    //     // position: "absolute",
    //     top: cellRect ? cellRect.top + cellRect.height / 3 : 0,
    //     left: cellRect ? cellRect?.left + cellRect.width - 8 : 0,
    //     // width: 16,
    //     // height: cellRect?.height,
    //     // background: "rgba(0,0,0,0.15)",
    //     // borderRadius: "4px",
    //     zIndex: 20,
    //   }}
    //   className={className}
    //   onMouseOver={() => {
    //     editor?.commands.lockTableHandle();
    //   }}
    //   onMouseLeave={() => {
    //     editor?.commands.unlockTableHandle();
    //   }}
    // >
    //   {children}
    // </div>
  );
}
