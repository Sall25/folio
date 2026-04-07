import { TableRowColOverlay } from "./table-row-col-overlay";
import { TableAddRowColOverlay } from "./table-add-row-col-overlay";
import { TableOverlaysProvider } from "./table-overlays-provider";
import type { Editor } from "@tiptap/core";
import { TableOverlayRowColButton } from "../table-overlay-row-column-button";
import { TableAddRowColButton } from "../table-add-row-column-button";
import { TableCellOverlay } from "./table-cell-overlay";

export function TableOverlays({
  editor,
  tablePos,
  className,
  //showOverlays = false,
}: {
  editor: Editor;
  tablePos?: number;
  className?: string;
  showOverlays?: boolean;
}) {
  return (
    <TableOverlaysProvider editor={editor}>
      <div className={className}>
        {/* Cell overlay */}
        <TableCellOverlay className="expandable-menu-button" />
        {/* Column overlay */}
        <TableRowColOverlay orientation="column">
          <TableOverlayRowColButton tablePos={tablePos} orientation="col" />
        </TableRowColOverlay>

        {/* Row overlay */}
        <TableRowColOverlay orientation="row">
          <TableOverlayRowColButton tablePos={tablePos} orientation="row" />
        </TableRowColOverlay>

        {/* Column add button */}
        <TableAddRowColOverlay orientation="column">
          <TableAddRowColButton orientation="col" />
        </TableAddRowColOverlay>

        {/* Row add button */}
        <TableAddRowColOverlay orientation="row">
          <TableAddRowColButton orientation="row" />
        </TableAddRowColOverlay>
      </div>
    </TableOverlaysProvider>
  );
}
