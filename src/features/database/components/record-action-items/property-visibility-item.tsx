import { Eye } from "lucide-react";
import { MenuRow } from "../menu-row";

export function PropertyVisibilityItem({
  onOpen,
  label = "Property visibility",
}: {
  onOpen: () => void;
  label?: string;
}) {
  return <MenuRow Icon={Eye} label={label} onClick={onOpen} />;
}
