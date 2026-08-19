import { createLucideIcon } from "lucide-react";

export const CommentIcon = createLucideIcon("comment", [
  [
    "path",
    {
      d: "M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4.5 3.5V17H5a3 3 0 0 1-3-3z",
      key: "bubble",
    },
  ],
  ["path", { d: "M7 9h10M7 12h6", key: "lines" }],
]);
CommentIcon.displayName = "CommentIcon";
