import type { Editor } from "@tiptap/core";
import {
  ColorHighlightButton,
  pickHighlightColorsByValue,
  type HighlightColor,
} from "../../../color-highlight-button";
import { ButtonGroup } from "src/components/tiptap-ui-primitive/button";

interface ColorHighlightListProps {
  editor: Editor;
  colors?: HighlightColor[];
}

export function ColorHighlightList({
  editor,
  colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
  ]),
}: ColorHighlightListProps) {
  return (
    <ButtonGroup orientation="vertical">
      {colors.map((c, i) => (
        <ColorHighlightButton
          key={i}
          editor={editor}
          highlightColor={c.colorValue}
        />
      ))}
    </ButtonGroup>
  );
}
