import type { User } from "./types";
import { Avatar } from "./avatar";

const user: User = {
  name: "Alice Johnson",
  src: "https://template.tiptap.dev/avatars/memoji_14.png",
  online: false,
};

export function AvatarDemo() {
  return (
    <Avatar
      name={user.name}
      src={user.src}
      online={user.online}
      size="xs"
      style={{
        margin: "0 3px",
        background: "#d9f99d",
      }}
    ></Avatar>
  );
}
