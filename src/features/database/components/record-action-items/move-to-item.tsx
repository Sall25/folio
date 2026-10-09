import { MoveRight } from "lucide-react";
import { MenuRow } from "../menu-row";

export function MoveToItem({
  onOpen,
  label = "Move to",
}: {
  onOpen: () => void;
  label?: string;
}) {
  return (
    <MenuRow
      Icon={MoveRight}
      label={label}
      shortcut="Ctrl+⇧+P"
      navigable
      onClick={onOpen}
    />
  );
}
