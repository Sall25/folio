import { Trash2 } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function DeletePropertyButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button className="tiptap-button-delete" variant="ghost" onClick={onDelete}>
      <Trash2 className="tiptap-button-icon" />
      <span className="tiptap-button-text">Delete property</span>
    </Button>
  );
}
