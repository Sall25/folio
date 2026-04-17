// page-item-icon.tsx

import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { File } from "lucide-react";
import type { Page } from "./types";
import type { CSSProperties } from "react";

interface PageItemIconProps {
  cover: Page["cover"];
  styles?: CSSProperties;
}

export function PageItemIcon({ cover, styles }: PageItemIconProps) {
  const hasIcon = Boolean(cover.iconName);

  if (cover.target === "Emoji" && hasIcon) {
    return (
      <span className="page-icon" style={{ ...styles }} aria-hidden="true">
        {cover.iconName}
      </span>
    );
  }

  if (cover.target === "Icons") {
    return (
      <span className="page-icon" style={{ ...styles }} aria-hidden="true">
        {hasIcon ? (
          <DynamicIcon
            stroke={cover.color ?? "var(--tt-text-color)"}
            name={cover.iconName!}
            size={14}
            strokeWidth={1.5}
          />
        ) : (
          <File size={18} strokeWidth={2} />
        )}
      </span>
    );
  }

  return (
    <span className="page-icon" style={{ ...styles }} aria-hidden="true">
      <File size={18} strokeWidth={2} />
    </span>
  );
}
