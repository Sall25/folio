import { Trash2 } from "lucide-react";
import { MenuRow } from "../menu-row";

export function MoveToTrashItem({ onDelete }: { onDelete: () => void }) {
  return (
    <MenuRow
      Icon={Trash2}
      label="Move to Trash"
      shortcut="Del"
      danger
      onClick={onDelete}
    />
  );
}
