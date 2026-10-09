import { Smile } from "lucide-react";
import { MenuRow } from "../menu-row";

export function EditIconItem({
  onOpen,
  label = "Edit icon",
}: {
  onOpen: () => void;
  label?: string;
}) {
  return <MenuRow Icon={Smile} label={label} onClick={onOpen} />;
}
