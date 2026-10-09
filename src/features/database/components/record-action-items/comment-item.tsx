import { MessageSquare } from "lucide-react";
import { MenuRow } from "../menu-row";

export function CommentItem({
  onComment,
  label = "Comment",
}: {
  onComment: () => void;
  label?: string;
}) {
  return (
    <MenuRow
      Icon={MessageSquare}
      label={label}
      shortcut="Ctrl+⇧+M"
      onClick={onComment}
    />
  );
}
