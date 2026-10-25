import { ArrowUpRight } from "src/components/icons";
import { MenuRow } from "../menu-row";

// Open in — navigates to the New tab / Side peek submenu.
export function OpenInItem({ onOpen }: { onOpen: () => void }) {
  return (
    <MenuRow Icon={ArrowUpRight} label="Open in" navigable onClick={onOpen} />
  );
}
