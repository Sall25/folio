import { Link2 } from "lucide-react";
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
