import { Smile } from "lucide-react";
import { MenuRow } from "../menu-row";

// Edit icon — opens the icon picker (composer swaps the menu view to the picker).
export function EditIconItem({ onOpen }: { onOpen: () => void }) {
  return <MenuRow Icon={Smile} label="Edit icon" onClick={onOpen} />;
}
