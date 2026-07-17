import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { Page } from "src/types";
import type { CSSProperties } from "react";

interface PageItemIconProps {
  cover: Page["cover"];
  styles?: CSSProperties;
}

export function PageItemIcon({ cover, styles }: PageItemIconProps) {
  const hasIcon = Boolean(cover.iconName);

  if (cover.target === "Emoji" && hasIcon) {
    return (
      <span
        className="page-icon"
        style={{ ...styles, fontSize: 15.5 }}
        aria-hidden="true"
      >
        {cover.iconName}
      </span>
    );
  }

  if (cover.target === "Icons") {
    return (
      <span className="page-icon" style={{ ...styles }} aria-hidden="true">
        {hasIcon ? (
          <DynamicIcon
            style={{
              color:
                !cover.color || cover.color === "var(--tt-text-color)"
                  ? "var(--tt-text-primary)"
                  : cover.color,
            }}
            name={cover.iconName!}
            size={20}
            weight={400}
            filled={true}
          />
        ) : (
          <DynamicIcon
            name="description"
            size={20}
            weight={400}
            filled={true}
            style={{
              color:
                !cover.color || cover.color === "var(--tt-text-color)"
                  ? "var(--tt-text-color)"
                  : cover.color,
            }}
          />
        )}
      </span>
    );
  }

  return (
    <span className="page-icon" style={{ ...styles }} aria-hidden="true">
      <DynamicIcon
        name="description"
        size={20}
        weight={400}
        filled={true}
        style={{
          color: "var(--tt-text-color)",
        }}
      />
    </span>
  );
}
