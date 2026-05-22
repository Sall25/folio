import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { EllipsisIcon, EllipsisVerticalIcon } from "lucide-react";
import { useTableOverlays } from "../table-overlays";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { TableMoveRowColButton } from "../table-move-row-column-button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { useCallback, useState } from "react";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { TableInsertRowColumnButton } from "../table-insert-row-column-button";
import { TableSortRowColButton } from "../table-sort-row-column-button";
import ColorDropdownMenu from "src/components/tiptap-ui/color-dropdown-menu";
import AlignmentDropdownMenu from "src/components/tiptap-ui/alignment-dropdown-menu";
import { TableDeleteRowColButton } from "../table-delete-row-column-button";
import { TableToggleHeaderRowColButton } from "../table-toggle-header-row-col-button";
import { TableDuplicateRowColButton } from "../table-duplicate-row-column-button";
import { useToggleHeaderRowCol } from "../table-toggle-header-row-col-button/useToggleHeaderRowCol";
import { useTableSortRowCol } from "../table-sort-row-column-button/use-table-sort-row-col";
import { TableClearRowColButton } from "../table-clear-row-column-button";
import "./table-overlay-row-column-button.scss";

interface TableOverlayRowColButtonProps {
  orientation?: "row" | "col";
  tablePos?: number;
}

export function ColumnDropdown({ tablePos }: { tablePos: number }) {
  const { editor, colIndex } = useTableOverlays();
  const [open, setOpen] = useState(false);

  const onAction = useCallback(() => {
    setOpen(false);
    editor?.commands.unlockTableHandle();
  }, [editor]);

  const { isVisible: showHeaderCol } = useToggleHeaderRowCol({
    target: "col",
    hideWhenUnavailable: true,
  });

  const { isVisible: showSortAsc } = useTableSortRowCol({
    target: "col",
    hideWhenUnavailable: true,
  });

  const { isVisible: showSortDesc } = useTableSortRowCol({
    target: "col",
    hideWhenUnavailable: true,
  });

  const showHeaderGroup = showHeaderCol;
  const showSortGroup = showSortAsc || showSortDesc;

  if (colIndex === -1) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          editor?.commands.unlockTableHandle();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          style={{
            width: "100%",
            height: "0.8rem",
            minWidth: "100%",
            minHeight: "0.6rem",
            padding: "4px",
          }}
          onPointerDown={() => {
            if (colIndex === undefined || !tablePos) return;
            editor?.commands.selectColumn(colIndex, tablePos);
            editor?.commands.lockTableHandle();
            setOpen(true);
          }}
          data-active-state={open ? "on" : "off"}
        >
          <EllipsisIcon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal container={document.body}>
        <DropdownMenuContent className="dropdown-menu-content">
          <Card className="dropdown-menu-container">
            {/* Table Headers Button */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableToggleHeaderRowColButton
                  hideWhenUnavailable={true}
                  target="col"
                  text="Header column"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            {showHeaderGroup && <Separator orientation="horizontal" />}
            {/* Table Move Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableMoveRowColButton
                  hideWhenUnavailable={true}
                  target="col"
                  orientation="left"
                  text="Move column left"
                  onAction={() => setOpen(false)}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableMoveRowColButton
                  hideWhenUnavailable={true}
                  target="col"
                  orientation="right"
                  text="Move column right"
                  onAction={() => setOpen(false)}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            <Separator orientation="horizontal" />
            {/* Table Insert Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableInsertRowColumnButton
                  target="col"
                  orientation="before"
                  text="Insert column left"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableInsertRowColumnButton
                  target="col"
                  orientation="after"
                  text="Insert column right"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            <Separator orientation="horizontal" />
            {/* Table Sort Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableSortRowColButton
                  tablePos={tablePos}
                  target="col"
                  ord="asc"
                  text="Sort column A-Z"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableSortRowColButton
                  tablePos={tablePos}
                  target="col"
                  ord="desc"
                  text="Sort column Z-A"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            {showSortGroup && <Separator orientation="horizontal" />}
            {/* Table Color Dropdown */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <ColorDropdownMenu
                  className="dropdown-menu-button"
                  editor={editor}
                  onAction={onAction}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <AlignmentDropdownMenu
                  className="dropdown-menu-button"
                  editor={editor}
                  onAction={onAction}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableClearRowColButton
                  target="col"
                  hideWhenUnavailable={true}
                  text="Clear all contents"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            <Separator orientation="horizontal" />
            {/* Table Delete/Duplicate Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableDuplicateRowColButton
                  target="col"
                  text="Duplicate column"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableDeleteRowColButton
                  target="col"
                  text="Delete column"
                  onAction={onAction}
                  hideWhenUnavailable={true}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

export function RowDropdown({ tablePos }: { tablePos: number }) {
  const { editor, rowIndex } = useTableOverlays();
  const [open, setOpen] = useState(false);

  const onAction = useCallback(() => {
    setOpen(false);
    editor?.commands.unlockTableHandle();
  }, [editor]);

  const { isVisible: showHeaderRow } = useToggleHeaderRowCol({
    target: "row",
    hideWhenUnavailable: true,
  });

  const { isVisible: showSortAsc } = useTableSortRowCol({
    target: "row",
    hideWhenUnavailable: true,
  });

  const { isVisible: showSortDesc } = useTableSortRowCol({
    target: "row",
    hideWhenUnavailable: true,
  });

  // const { isVisible: showDuplicate } = useTableDuplicateRowCol({
  //   target: "row",
  //   hideWhenUnavailable: true,
  // });

  const showHeaderGroup = showHeaderRow;
  const showSortGroup = showSortAsc || showSortDesc;
  //const showDeleteGroup = true; // delete is always visible

  if (rowIndex === -1) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          editor?.commands.unlockTableHandle();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          style={{
            width: "0.8rem",
            height: "100%",
            minWidth: "0.8rem",
            minHeight: "100%",
            padding: "4px",
          }}
          onPointerDown={() => {
            if (rowIndex === undefined || !tablePos) return;
            editor?.commands.selectRow(rowIndex, tablePos);
            editor?.commands.lockTableHandle();
            setOpen(true);
          }}
          data-state-active={open ? "on" : "off"}
        >
          <EllipsisVerticalIcon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal container={document.body}>
        <DropdownMenuContent className="dropdown-menu-content">
          <Card className="dropdown-menu-container">
            {/* Table Headers Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableToggleHeaderRowColButton
                  hideWhenUnavailable={true}
                  target="row"
                  text="Header row"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            {showHeaderGroup && <Separator orientation="horizontal" />}
            {/*Table Move Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableMoveRowColButton
                  hideWhenUnavailable={true}
                  target="row"
                  orientation="up"
                  text="Move row up"
                  onAction={() => setOpen(false)}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableMoveRowColButton
                  hideWhenUnavailable={true}
                  target="row"
                  orientation="down"
                  text="Move row down"
                  onAction={() => setOpen(false)}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            {/* Table Insert Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableInsertRowColumnButton
                  orientation="before"
                  target="row"
                  text="Insert row above"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableInsertRowColumnButton
                  orientation="after"
                  target="row"
                  text="Insert row below"
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            <Separator orientation="horizontal" />
            {/* Table Sort Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableSortRowColButton
                  tablePos={tablePos}
                  target="row"
                  ord="asc"
                  text="Sort row A-Z"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableSortRowColButton
                  tablePos={tablePos}
                  target="row"
                  ord="desc"
                  text="Sort row Z-A"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                  className="dropdown-menu-button"
                />
              </DropdownMenuItem>
            </ButtonGroup>
            {showSortGroup && <Separator orientation="horizontal" />}
            {/* Table Color Dropdown */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <ColorDropdownMenu
                  className="dropdown-menu-button"
                  editor={editor}
                  onAction={onAction}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <AlignmentDropdownMenu
                  className="dropdown-menu-button"
                  editor={editor}
                  onAction={onAction}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableClearRowColButton
                  className="dropdown-menu-button"
                  target="row"
                  hideWhenUnavailable={true}
                  text="Clear all contents"
                  onAction={onAction}
                />
              </DropdownMenuItem>
            </ButtonGroup>

            <Separator orientation="horizontal" />

            {/* Table Delete/Duplicate Buttons */}
            <ButtonGroup className="dropdown-menu-group">
              <DropdownMenuItem asChild>
                <TableDeleteRowColButton
                  className="dropdown-menu-button"
                  target="row"
                  text="Delete row"
                  onAction={onAction}
                  hideWhenUnavailable={false}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TableDuplicateRowColButton
                  className="dropdown-menu-button"
                  target="row"
                  text="Duplicate row"
                  hideWhenUnavailable={true}
                  onAction={onAction}
                />
              </DropdownMenuItem>
            </ButtonGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

export function TableOverlayRowColButton({
  orientation,
  tablePos,
}: TableOverlayRowColButtonProps) {
  return (
    <>
      {orientation === "row" && tablePos && <RowDropdown tablePos={tablePos} />}
      {orientation === "col" && tablePos && (
        <ColumnDropdown tablePos={tablePos} />
      )}
    </>
  );
}
