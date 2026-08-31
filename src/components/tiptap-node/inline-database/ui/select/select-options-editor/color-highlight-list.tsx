import { useMemo, type CSSProperties } from "react";
import { Check } from "lucide-react";
import {
  pickHighlightColorsByValue,
  type HighlightColor,
} from "../../../../../tiptap-ui/color-highlight-button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export interface ColorHighlightMenuListProps {
  colors?: HighlightColor[];
  useColorValue?: boolean;
  onAction?: (color?: string) => void;
  /** The currently applied color value — the matching row shows a check. */
  selectedValue?: string;
}

function HighlightButton({
  highlightColor,
  style,
  onClick,
  text,
  selected,
}: {
  highlightColor: string;
  style: CSSProperties;
  onClick?: () => void;
  text: string;
  selected?: boolean;
}) {
  const buttonStyle = useMemo(
    () =>
      ({
        ...style,
        "--highlight-color": highlightColor,
      }) as React.CSSProperties,
    [highlightColor, style],
  );

  return (
    <Button
      variant="ghost"
      style={buttonStyle}
      className="color-highlight-button"
      onClick={onClick}
      data-selected={selected ? "true" : undefined}
    >
      <span
        className="tiptap-button-highlight"
        style={{ "--highlight-color": highlightColor } as React.CSSProperties}
      />
      <Spacer orientation="horizontal" size={4} />
      <span className="color-highlight-button__label">{text}</span>
      {selected && (
        <Check className="tiptap-button-icon-sub color-highlight-button__check" />
      )}
    </Button>
  );
}

export function ColorHighlightList({
  colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
    "var(--tt-color-highlight-pink)",
    "var(--tt-color-highlight-orange)",
    "var(--tt-color-highlight-brown)",
    "var(--tt-color-highlight-gray)",
  ]),
  onAction,
  selectedValue,
}: ColorHighlightMenuListProps) {
  return (
    <>
      {colors.map((color, index) => (
        <CardItemGroup key={index} style={{ width: "100%", gap: 2 }}>
          <HighlightButton
            highlightColor={color.value}
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => onAction?.(color.value)}
            text={color.label}
            selected={selectedValue === color.value}
          />
        </CardItemGroup>
      ))}
    </>
  );
}
