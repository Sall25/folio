import { createLucideIcon } from "lucide-react";

export const LockIcon = createLucideIcon("lock", [
  [
    "rect",
    { x: "3", y: "10", width: "18", height: "11", rx: "4", key: "body" },
  ],
  ["path", { d: "M7 10V7.5a5 5 0 0 1 10 0V10", key: "shackle" }],
]);
LockIcon.displayName = "LockIcon";
