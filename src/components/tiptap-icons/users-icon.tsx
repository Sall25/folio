import { createLucideIcon } from "lucide-react";

export const UsersIcon = createLucideIcon("users", [
  ["circle", { cx: "12", cy: "7", r: "3.2", key: "head-center" }],
  ["circle", { cx: "5", cy: "10", r: "2.6", key: "head-left" }],
  ["circle", { cx: "19", cy: "10", r: "2.6", key: "head-right" }],
  ["path", { d: "M6 20a6 6 0 0 1 12 0", key: "bodies" }],
]);
UsersIcon.displayName = "UsersIcon";
