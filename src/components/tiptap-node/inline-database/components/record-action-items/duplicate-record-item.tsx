import { MenuRow } from "../menu-row";
import { Copy } from "lucide-react";

export function DuplicateRecordItem({
  onDuplicate,
}: {
  onDuplicate: () => void;
}) {
  return (
    <MenuRow
      Icon={Copy}
      label="Duplicate"
      shortcut="Ctrl+D"
      onClick={onDuplicate}
    />
  );
}
