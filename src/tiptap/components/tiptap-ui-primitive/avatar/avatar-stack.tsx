import { Avatar } from "./avatar";
import { SIZE } from "./data";
import type { AvatarSize, User } from "./types";


interface AvatarStackProps {
  users: User[] // Array of { name, src, online }
  size: AvatarSize  // Passed to each Avatar
  max: number // Max avatars before "+N" overflow badge (default 5)
  overlap: number // Pixel overlap between avatars (default 10)
}

export function AvatarStack({
  users = [],
  size = 'md',
  max = 5,
  overlap = 10
}: AvatarStackProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const s = SIZE[size] ?? SIZE.md;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        // Total width shrinks by `overlap` per extra avatar
        paddingRight: overlap,
      }}
    >
      {visible.map((user, i) => (
        <Avatar
          key={user.name + i}
          name={user.name}
          src={user.src}
          online={user.online}
          size={size}
          style={{ marginLeft: i === 0 ? 0 : -overlap }}
        />
      ))}

      {overflow > 0 && (
        <span
          title={`${overflow} more`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: s.box,
            height: s.box,
            borderRadius: "50%",
            background: "#e5e7eb",
            color: "#374151",
            fontSize: s.font,
            fontWeight: 700,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            border: "2px solid white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
            marginLeft: -overlap,
            boxSizing: "border-box",
            userSelect: "none",
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}