import { Trash2 } from "lucide-react";
import { memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";

function DeleteButtonImpl({ onDelete }: { onDelete: () => void }) {
  return (
    <Button
      className="tiptap-button-delete"
      variant="ghost"
      tooltip="Delete records"
      onClick={onDelete}
    >
      <Trash2 className="tiptap-button-icon" size={16} />
    </Button>
  );
}

export const DeleteButton = memo(DeleteButtonImpl);
