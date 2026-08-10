import { AvatarStack } from "src/components/tiptap-ui-primitive/avatar";
import type { PresenceUser } from "../../hooks/use-presence";
import "./presence-stack.scss";

export function PresenceStack({
  users,
  max = 2,
}: {
  users: PresenceUser[];
  max?: number;
}) {
  if (users.length === 0) return null;

  return (
    <div className="presence-stack">
      <AvatarStack
        users={users.map((u) => ({
          name: u.name,
          src:
            u.avatarUrl ?? "https://template.tiptap.dev/avatars/memoji_14.png",
          online: false, // the whole stack already means "here now"
        }))}
        size="sm"
        max={max}
        overlap={6}
      />
      <span className="presence-stack__label">{users.length} here now</span>
    </div>
  );
}
