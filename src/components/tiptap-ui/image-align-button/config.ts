import {
  AlignImgLeftIcon,
  AlignImgCenterIcon,
  AlignImgRightIcon,
} from "src/components/tiptap-icons";

import type { AlignValue } from "./types";

export const ALIGN_CONFIG: Record<
  AlignValue,
  { label: string; shortcut: string; Icon: React.FC<{ className?: string }> }
> = {
  left: {
    label: "Align Left",
    shortcut: "Alt+Shift+L",
    Icon: AlignImgLeftIcon,
  },
  center: {
    label: "Align Center",
    shortcut: "Alt+Shift+E",
    Icon: AlignImgCenterIcon,
  },
  right: {
    label: "Align Right",
    shortcut: "Alt+Shift+R",
    Icon: AlignImgRightIcon,
  },
};
