import { createLucideIcon } from "lucide-react";

export const MessageIcon = createLucideIcon("message", [
  [
    "path",
    {
      d: "M2 11.5a9.5 9.5 0 1 1 4.2 7.9L2.5 20.5l1-3.7A9.4 9.4 0 0 1 2 11.5z",
      key: "bubble",
    },
  ],
  ["path", { d: "M8 9.5h8M8 13h5", key: "lines" }],
]);
MessageIcon.displayName = "MessageIcon";
