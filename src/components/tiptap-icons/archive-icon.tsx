import { createLucideIcon } from "lucide-react";

export const ArchiveIcon = createLucideIcon("archive", [
  [
    "path",
    {
      d: "M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1.5a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 8.5z",
      key: "lid",
    },
  ],
  ["path", { d: "M3.5 10v7.5a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3V10", key: "box" }],
  ["path", { d: "M10 14h4", key: "handle" }],
]);
ArchiveIcon.displayName = "ArchiveIcon";
