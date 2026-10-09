import { LayoutIcon } from "lucide-react";
import { MenuRow } from "../menu-row";

export function LayoutItem({
  onOpen,
  label = "Layout",
}: {
  onOpen: () => void;
  label?: string;
}) {
  return <MenuRow Icon={LayoutIcon} label={label} onClick={onOpen} />;
}
