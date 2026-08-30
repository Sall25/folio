import { MenuRow } from "../menu-row";
import { Link2 } from "lucide-react";

export function CopyLinkItem({ onCopyLink }: { onCopyLink: () => void }) {
  return <MenuRow Icon={Link2} label="Copy link" onClick={onCopyLink} />;
}
