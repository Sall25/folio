import { createLucideIcon } from "lucide-react";

export const PenIcon = createLucideIcon("pen", [
  [
    "path",
    {
      d: "M11 4H5a2.5 2.5 0 0 0-2.5 2.5v12A2.5 2.5 0 0 0 5 21h12a2.5 2.5 0 0 0 2.5-2.5v-6",
      key: "box",
    },
  ],
  [
    "path",
    { d: "M17 2.8a1.8 1.8 0 0 1 2.6 2.6L12 13l-3.5 1 1-3.5z", key: "pen" },
  ],
]);
PenIcon.displayName = "PenIcon";
