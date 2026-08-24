import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { Page } from "src/types";
import type { CSSProperties } from "react";
import { FileText } from "src/components/tiptap-icons";

interface PageItemIconProps {
  cover: Page["cover"];
  styles?: CSSProperties;
  usePrimaryColor?: boolean;
}

export function PageItemIcon({ cover, styles }: PageItemIconProps) {
  const hasIcon = Boolean(cover.iconName);

  if (cover.target === "Emoji" && hasIcon) {
    return (
      <span
        className="page-icon"
        style={{ ...styles, fontSize: 16.5 }}
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
            size={37}
          />
        ) : (
          <FileText
            size={38}
            style={{
              width: 38,
              height: 38,
              color:
                !cover.color || cover.color === "var(--tt-text-color)"
                  ? "var(--tt-text-color)"
                  : cover.color,
            }}
          />
          // <DynamicIcon
          //   name="description"
          //   size={21}
          //   weight={400}
          //   filled={false}
          //   style={{
          //     color:
          //       !cover.color || cover.color === "var(--tt-text-color)"
          //         ? "var(--tt-text-color)"
          //         : cover.color,
          //   }}
          // />
        )}
      </span>
    );
  }

  return (
    <span className="page-icon" /*style={{ ...styles }}*/ aria-hidden="true">
      <FileText size={38} style={{ width: 38, height: 38 }} />
    </span>
  );
}
