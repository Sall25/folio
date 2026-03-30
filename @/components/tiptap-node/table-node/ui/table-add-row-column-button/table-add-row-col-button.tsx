import { Button } from "@/components/tiptap-ui-primitive/button";
import { PlusIcon } from "lucide-react";
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
      style={{
        width: orientation === "col" ? "0.6rem" : "100%",
        height: orientation === "row" ? "0.6rem" : "100%",
        minWidth: orientation === "col" ? "0.6rem" : "100%",
        minHeight: orientation === "row" ? "0.6rem" : "100%",
        padding: "4px",
      }}
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
