import { MenuRow } from "../menu-row";
import { MessageSquare } from "lucide-react";

export function CommentItem({ onComment }: { onComment: () => void }) {
  return (
    <MenuRow
      Icon={MessageSquare}
      label="Comment"
      shortcut="Ctrl+⇧+M"
      onClick={onComment}
    />
  );
}
