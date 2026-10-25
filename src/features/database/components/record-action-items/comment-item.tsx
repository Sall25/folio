import { MessageSquare } from "src/components/icons";
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
