import { Copy } from "lucide-react";
import { MenuRow } from "../menu-row";

export function DuplicateRecordItem({
  onDuplicate,
  label = "Duplicate",
}: {
  onDuplicate: () => void;
  label?: string;
}) {
  return (
    <MenuRow
      Icon={Copy}
      label={label}
      shortcut="Ctrl+D"
      onClick={onDuplicate}
    />
  );
}
