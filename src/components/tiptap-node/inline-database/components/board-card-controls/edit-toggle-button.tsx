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
      data-active-state={editing ? "on" : undefined}
      tooltip={editing ? "Open page" : "Edit title"}
      onClick={(e) => {
        e.stopPropagation();
        if (editing) {
          onOpen(); // editing mode → open the page
        } else {
          onEnableEdit(); // default → turn on title editing (focus title)
        }
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
