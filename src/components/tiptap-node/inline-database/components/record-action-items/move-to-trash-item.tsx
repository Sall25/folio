import { Trash2 } from "lucide-react";
import { MenuRow } from "../menu-row";
import { ConfirmDialog } from "src/components/tiptap-templates/simple/components/confirm-dialog";
import { useState } from "react";

export function MoveToTrashItem({ onDelete }: { onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <MenuRow
        Icon={Trash2}
        label="Move to Trash"
        shortcut="Del"
        danger
        onClick={() => setConfirmOpen(true)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
        message={<>Delete this record?</>}
      />
    </>
  );
}
