import { forwardRef } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

export const SortChipButton = forwardRef<
  HTMLButtonElement,
  { count: number; locked: boolean } & React.ComponentProps<typeof Button>
>(({ count, locked, ...props }, ref) => {
  const label = count === 1 ? "1 sort" : `${count} sorts`;
  return (
    <Button
      ref={ref}
      {...props}
      variant="ghost"
      style={{
        height: 24,
        minHeight: 24,
        padding: "0 8px",
        gap: 5,
        borderRadius: "var(--tt-radius-lg)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--tt-brand-color-400)",
        background:
          "color-mix(in srgb, var(--tt-brand-color-400) 14%, transparent)",
        cursor: locked ? "default" : undefined,
        ...props.style, // let injected style merge, don't clobber
      }}
    >
      <ArrowUpDown
        size={13}
        className="tiptap-button-icon"
        style={{ color: "inherit" }}
      />
      <span className="tiptap-button-text">{label}</span>
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
