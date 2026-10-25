import { Button } from "src/components/tiptap-ui-primitive/button";
import { PlusIcon } from "src/components/icons";
import { useTableOverlays } from "../table-overlays";

export function TableAddRowColButton({
  orientation,
}: {
  orientation: "row" | "col";
}) {
  const { editor } = useTableOverlays();

  if (!editor) return null;

  return (
    <Button
      className="table-grip"
      // A row is added below: the grip lies flat on the bottom border; a
      // column to the right: it stands on the right border.
      data-orientation={orientation === "row" ? "col" : "row"}
      aria-label={orientation === "row" ? "Add a row" : "Add a column"}
      onClick={() => {
        if (orientation === "col") {
          editor.commands.addColumnAtEnd();
        } else {
          editor.commands.addRowAtEnd();
        }
      }}
    >
      <PlusIcon className="tiptap-button-icon" />
    </Button>
  );
}
