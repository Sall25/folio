import { Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { ConfirmDialog } from "src/components/tiptap-templates/simple/components/confirm-dialog";
import { Button } from "src/components/tiptap-ui-primitive/button";

function DeleteButtonImpl({
  onDelete,
  count = 1,
}: {
  onDelete: () => void;
  count?: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <Button
        className="tiptap-button-delete"
        variant="ghost"
        tooltip="Delete records"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="tiptap-button-icon" size={16} />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
        message={
          <>
            Delete {count > 1 ? "all" : "the"} {count} selected{" "}
            {count > 1 ? "records" : "record"}?
          </>
        }
      />
    </>
  );
}

export const DeleteButton = memo(DeleteButtonImpl);
