import { forwardRef } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseProperty } from "src/types";

export const SortChipButton = forwardRef<
  HTMLButtonElement,
  {
    count: number;
    locked: boolean;
    property?: DatabaseProperty;
  } & Omit<React.ComponentProps<typeof Button>, "count" | "locked" | "property">
>(({ count, locked, property, ...props }, ref) => {
  const label = count === 1 ? "1 sort" : `${count} sorts`;
  const propName = property?.name;

  return (
    <Button
      ref={ref}
      {...props}
      variant="ghost"
      style={{
        padding: "0 8px",
        minHeight: 26,
        height: 26,
        gap: 5,
        borderRadius: "var(--tt-radius-xl)",
        color: "var(--tt-brand-color-300)",
        background:
          "color-mix(in srgb, var(--tt-brand-color-300) 14%, transparent)",
        cursor: locked ? "default" : undefined,
        ...props.style, // let injected style merge, don't clobber
      }}
    >
      <ArrowUpDown
        key={"arrow-up-down"}
        size={13}
        className="tiptap-button-icon"
        style={{ color: "inherit" }}
      />
      <span className="tiptap-button-text">{propName ?? label}</span>
      {!locked && (
        <ChevronDown
          size={11}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );
});

SortChipButton.displayName = "SortChipButton";
