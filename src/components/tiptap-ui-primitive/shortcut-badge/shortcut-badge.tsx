import { Badge } from "../badge";

export function ShortcutBadge({ shortcutKeys }: { shortcutKeys: string }) {
  return (
    <Badge>
      <span>{shortcutKeys}</span>
    </Badge>
  );
}
