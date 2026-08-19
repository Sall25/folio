import { createLucideIcon } from "lucide-react";

export const FileIcon = createLucideIcon("file", [
  [
    "path",
    {
      d: "M6.5 2.5h4.3a2 2 0 0 1 1.4.6l6 6a2 2 0 0 1 .6 1.4V17.5a4.5 4.5 0 0 1-4.5 4.5H6.5A4.5 4.5 0 0 1 2 17.5v-10.5A4.5 4.5 0 0 1 6.5 2.5z",
      key: "body",
    },
  ],
  ["path", { d: "M11 2.7v5.3a2.5 2.5 0 0 0 2.5 2.5h5.1", key: "fold" }],
]);

FileIcon.displayName = "FileIcon";
