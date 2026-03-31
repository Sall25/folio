import {
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { useColorDropdownContext } from "./use-color-dropdown-context";
import { useRef } from "react";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";
import { ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { ColorHighlightButton } from "../color-highlight-button";
import type { Editor } from "@tiptap/core";
import { ColorTextButton } from "../color-text-button";

export function ColorRecentMenuList({ editor }: { editor: Editor | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { recentColors } = useColorDropdownContext();
  const isMobile = useIsBreakpoint();

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: recentColors,
    onSelect: () => {
      if (!containerRef.current) return false;
      const textedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]',
      ) as HTMLElement;
      if (textedElement) textedElement.click();
      return true;
    },
    autoSelectFirstItem: false,
  });

  return (
    <CardBody
      ref={containerRef}
      tabIndex={0}
      style={isMobile ? { padding: 0 } : {}}
    >
      <CardItemGroup orientation="vertical">
        <ButtonGroup orientation="vertical">
          {recentColors.map((color, index) => (
            <div key={index}>
              {color.type === "highlight" && (
                <ColorHighlightButton
                  key={index}
                  editor={editor}
                  highlightColor={color.color}
                  aria-label={`${color.label} highlight color`}
                  data-highlighted={selectedIndex === index}
                  text={color.label}
                  mode={"node"}
                />
              )}
              {color.type === "text" && (
                <ColorTextButton
                  key={index}
                  editor={editor}
                  textColor={color.color}
                  aria-label={`${color.label} text color`}
                  data-highlighted={selectedIndex === index}
                  text={color.label}
                  mode={"node"}
                />
              )}
            </div>
          ))}
        </ButtonGroup>
      </CardItemGroup>
    </CardBody>
  );
}
