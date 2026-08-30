import { MoveRight } from "lucide-react";
import { MenuRow } from "../menu-row";

export function MoveToItem({ onOpen }: { onOpen: () => void }) {
  return (
    <MenuRow
      Icon={MoveRight}
      label="Move to"
      shortcut="Ctrl+⇧+P"
      navigable
      onClick={onOpen}
    />
  );
}
