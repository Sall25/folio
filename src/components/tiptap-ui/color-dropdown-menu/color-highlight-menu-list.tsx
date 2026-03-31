import {
  ColorHighlightButton,
  pickHighlightColorsByValue,
  useColorHighlight,
  type HighlightColor,
  type UseColorHighlightConfig,
} from "../color-highlight-button";
import { useMemo, useRef } from "react";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { BanIcon } from "src/components/tiptap-icons";
import { useColorDropdownContext } from "./use-color-dropdown-context";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";

export interface ColorHighlightMenuListProps extends Pick<
  UseColorHighlightConfig,
  "editor"
> {
  colors?: HighlightColor[];
  useColorValue?: boolean;
  onAction?: () => void;
}

export function ColorHighlightMenuList({
  editor,
  colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
  ]),
  useColorValue = false,
  onAction,
}: ColorHighlightMenuListProps) {
  const { handleRemoveHighlight } = useColorHighlight({ editor, mode: "node" });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(
    () => [...colors, { label: "Remove highlight", value: "none" }],
    [colors],
  );

  const { selectedIndex } = useMenuNavigation({
    editor,
    containerRef,
    items,
    orientation: "vertical",
    onSelect: (item) => {
      console.log("selected index selected:", item);
      if (!containerRef.current) return false;

      const highlightedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]',
      ) as HTMLElement;
      if (highlightedElement) highlightedElement.click();
      if (item.value === "none") handleRemoveHighlight();
      onAction?.();
      return true;
    },
    autoSelectFirstItem: true,
  });

  const { addRecentColor } = useColorDropdownContext();

  return (
    <ButtonGroup
      ref={containerRef}
      orientation="vertical"
      style={{
        width: "100%",
      }}
    >
      {colors.map((color, index) => (
        <DropdownMenuItem key={index} asChild>
          <ColorHighlightButton
            role="menuitem"
            disabled={false}
            data-disabled={false}
            showTooltip={false}
            editor={editor}
            highlightColor={useColorValue ? color.colorValue : color.value}
            // tabIndex={index === selectedIndex ? 0 : -1}
            data-highlighted={selectedIndex === index}
            useColorValue={useColorValue}
            text={color.label}
            onApplied={({ color, label }) => {
              addRecentColor({
                color,
                label,
                type: "highlight",
              });
              console.log("recent color added");
              onAction?.();
            }}
            mode={"node"}
            style={{
              width: "100%",
              gap: "8px",
            }}
          />
        </DropdownMenuItem>
      ))}
      <DropdownMenuItem asChild>
        <Button
          className="color-highlight-button"
          onClick={handleRemoveHighlight}
          aria-label="Remove highlight"
          tabIndex={selectedIndex === colors.length ? 0 : -1}
          type="button"
          role="menuitem"
          variant="ghost"
          data-highlighted={selectedIndex === colors.length}
        >
          <BanIcon className="tiptap-button-icon" />
          <span>Remove highlight</span>
        </Button>
      </DropdownMenuItem>
    </ButtonGroup>
  );
}
