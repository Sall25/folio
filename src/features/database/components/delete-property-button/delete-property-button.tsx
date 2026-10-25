import { Trash2 } from "src/components/icons";
import { useState } from "react";
import { ConfirmDialog } from "src/features/shell/confirm-dialog";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function DeletePropertyButton({ onDelete }: { onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        className="tiptap-button-delete"
        variant="ghost"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="tiptap-button-icon" />
        <span className="tiptap-button-text">Delete property</span>
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
        message={<>Delete this property?</>}
      />
    </>
  );
}
