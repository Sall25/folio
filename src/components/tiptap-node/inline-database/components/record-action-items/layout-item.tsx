import { LayoutIcon } from "lucide-react";
import { MenuRow } from "../menu-row";

// Layout — opens the layout panel.
export function LayoutItem({ onOpen }: { onOpen: () => void }) {
  return <MenuRow Icon={LayoutIcon} label="Layout" onClick={onOpen} />;
}
