import { Link2 } from "src/components/icons";
import { MenuRow } from "../menu-row";

export function CopyLinkItem({
  onCopyLink,
  label = "Copy link",
}: {
  onCopyLink: () => void;
  label?: string;
}) {
  return <MenuRow Icon={Link2} label={label} onClick={onCopyLink} />;
}
