import { Eye } from "lucide-react";
import { MenuRow } from "../menu-row";

// Property visibility — opens the properties panel.
export function PropertyVisibilityItem({ onOpen }: { onOpen: () => void }) {
  return <MenuRow Icon={Eye} label="Property visibility" onClick={onOpen} />;
}
