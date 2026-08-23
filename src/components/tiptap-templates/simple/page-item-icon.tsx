import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { Page } from "src/types";
import type { CSSProperties } from "react";
import { FileText } from "lucide-react";

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
          <FileText
            size={36}
            style={{
              width: 32,
              height: 32,
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
      <FileText size={36} style={{ width: 32, height: 32 }} />
      {/* <DynamicIcon
        name="description"
        size={22}
        weight={400}
        filled={false}
        style={{
          color: usePrimaryColor
            ? "var(--tt-text-primary)"
            : "var(--tt-text-color)",
        }}
      /> */}
    </span>
  );
}
