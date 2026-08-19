import { createLucideIcon } from "lucide-react";

export const InboxIcon = createLucideIcon("inbox", [
  [
    "path",
    {
      d: "M1 13 4.2 6a3.5 3.5 0 0 1 3.2-2h9.2a3.5 3.5 0 0 1 3.2 2L23 13v4.5a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4z",
      key: "body",
    },
  ],
  [
    "path",
    {
      d: "M1 13h4.5a2.5 2.5 0 0 1 2.5 2.5 1 1 0 0 0 1 1h6a1 1 0 0 0 1-1 2.5 2.5 0 0 1 2.5-2.5H23",
      key: "slot",
    },
  ],
]);

InboxIcon.displayName = "InboxIcon";
