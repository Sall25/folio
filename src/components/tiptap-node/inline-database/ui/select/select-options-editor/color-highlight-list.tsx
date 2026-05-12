import { useMemo, type CSSProperties } from "react";
import {
  pickHighlightColorsByValue,
  type HighlightColor,
} from "../../../../../tiptap-ui/color-highlight-button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

export interface ColorHighlightMenuListProps {
  colors?: HighlightColor[];
  useColorValue?: boolean;
  onAction?: (color?: string) => void;
}

function HighlightButton({
  highlightColor,
  style,
  onClick,
  text,
}: {
  highlightColor: string;
  style: CSSProperties;
  onClick?: () => void;
  text: string;
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
    >
      <span
        className="tiptap-button-highlight"
        style={{ "--highlight-color": highlightColor } as React.CSSProperties}
      />
      <span style={{ marginLeft: 5 }}> {text}</span>
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
          />
        </CardItemGroup>
      ))}
    </>
  );
}
