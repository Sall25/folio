// import { SortAscIcon } from "src/components/tiptap-icons/sort-asc-icon";
// import { SortDescIcon } from "src/components/tiptap-icons/sort-desc-icon";
// import { Button } from "src/components/tiptap-ui-primitive/button";
// import { useTableOverlays } from "../table-overlays";

// interface SortRowColButtonProps {
//   target?: "row" | "col";
//   ord?: "asc" | "desc";
//   hasHeader?: boolean;
//   tablePos: number;
//   text?: string;
//   onAction?: () => void;
// }

// export function TableSortRowColButton({
//   target = "row",
//   ord = "asc",
//   hasHeader = false,
//   text,
//   tablePos,
//   onAction,
// }: SortRowColButtonProps) {
//   const { editor, rowIndex, colIndex } = useTableOverlays();

//   if (!editor) return null;

//   return (
//     <Button
//       variant="ghost"
//       style={{
//         justifyContent: "flex-start",
//       }}
//       onClick={() => {
//         if (rowIndex === undefined || colIndex === undefined) return;
//         if (target === "row") {
//           editor.commands.sortRow(rowIndex, tablePos, ord);
//         } else if (target === "col") {
//           editor.commands.sortColumn(colIndex, tablePos, ord, hasHeader);
//         }
//         onAction?.();
//       }}
//     >
//       {ord === "asc" && <SortAscIcon className="tiptap-button-icon" />}
//       {ord === "desc" && <SortDescIcon className="tiptap-button-icon" />}
//       {text && <span>{text}</span>}
//     </Button>
//   );
// }

import { SortAscIcon } from "src/components/tiptap-icons/sort-asc-icon";
import { SortDescIcon } from "src/components/tiptap-icons/sort-desc-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTableOverlays } from "../table-overlays";
import { useTableSortRowCol } from "./use-table-sort-row-col";

interface SortRowColButtonProps {
  target?: "row" | "col";
  ord?: "asc" | "desc";
  hasHeader?: boolean;
  tablePos: number;
  text?: string;
  hideWhenUnavailable?: boolean;
  onAction?: () => void;
  className?: string;
}

export function TableSortRowColButton({
  target = "row",
  ord = "asc",
  hasHeader = false,
  text,
  tablePos,
  hideWhenUnavailable = false,
  onAction,
  className,
}: SortRowColButtonProps) {
  const { editor, rowIndex, colIndex } = useTableOverlays();
  const { isVisible } = useTableSortRowCol({ target, hideWhenUnavailable });

  if (!editor || !isVisible) return null;

  return (
    <Button
      variant="ghost"
      style={{ justifyContent: "flex-start" }}
      onClick={() => {
        if (rowIndex === undefined || colIndex === undefined) return;
        if (target === "row") {
          editor.commands.sortRow(rowIndex, tablePos, ord);
        } else if (target === "col") {
          editor.commands.sortColumn(colIndex, tablePos, ord, hasHeader);
        }
        onAction?.();
      }}
      className={className}
    >
      {ord === "asc" && <SortAscIcon className="tiptap-button-icon" />}
      {ord === "desc" && <SortDescIcon className="tiptap-button-icon" />}
      {text && <span>{text}</span>}
    </Button>
  );
}
