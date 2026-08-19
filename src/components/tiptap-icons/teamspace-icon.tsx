import { createLucideIcon } from "lucide-react";

export const TeamspaceIcon = createLucideIcon("teamspace", [
  [
    "rect",
    { x: "2", y: "3", width: "20", height: "18", rx: "4", key: "frame" },
  ],
  ["circle", { cx: "12", cy: "10", r: "2.4", key: "head" }],
  ["path", { d: "M8 17a4 4 0 0 1 8 0", key: "body" }],
]);
TeamspaceIcon.displayName = "TeamspaceIcon";
