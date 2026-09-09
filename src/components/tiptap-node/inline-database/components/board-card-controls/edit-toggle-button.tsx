import { Pencil, SquareSquare } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./edit-toggle-button.scss";

export function EditToggleButton({
  editing,
  onEnableEdit,
  onOpen,
}: {
  editing: boolean;
  onEnableEdit: () => void;
  onOpen: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="db-card-controls__btn"
      size="small"
      data-active-state={editing ? "on" : undefined}
      tooltip={editing ? "Open page" : "Edit title"}
      onPointerDown={(e) => {
        e.preventDefault(); // prevent the title from blurring
        e.stopPropagation();
        if (editing) onOpen();
        else onEnableEdit();
      }}
    >
      {editing ? (
        <SquareSquare className="tiptap-button-icon" size={14} />
      ) : (
        <Pencil className="tiptap-button-icon" size={14} />
      )}
    </Button>
  );
}
