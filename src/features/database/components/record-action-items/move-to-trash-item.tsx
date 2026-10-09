import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "src/features/shell/confirm-dialog";
import { MenuRow } from "../menu-row";

export function MoveToTrashItem({
  onDelete,
  label = "Move to Trash",
}: {
  onDelete: () => void;
  label?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <MenuRow
        Icon={Trash2}
        label={label}
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
